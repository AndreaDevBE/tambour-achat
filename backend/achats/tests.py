from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from achats.models import Product, Purchase, PurchaseLine, Supplier, TechnicalSettings


class PurchaseApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.supplier = Supplier.objects.create(name="Fournisseur A")
        self.product = Product.objects.create(name="Planche")

    def test_create_purchase_with_lines_and_calculated_total(self):
        response = self.client.post(
            "/api/achats/",
            {
                "supplier": self.supplier.pk,
                "planned_date": "2026-10-20",
                "lines": [
                    {
                        "product": self.product.pk,
                        "quantity": "2.500",
                        "unit_price": "12.40",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], Purchase.Status.PLANNED)
        self.assertEqual(response.data["supplier_name"], self.supplier.name)
        self.assertEqual(response.data["lines"][0]["product_name"], self.product.name)
        self.assertEqual(response.data["total"], Decimal("31.000"))
        self.assertEqual(PurchaseLine.objects.count(), 1)

    def test_purchase_status_transition_sets_the_stage_date(self):
        purchase = Purchase.objects.create(
            supplier=self.supplier, status=Purchase.Status.PLANNED
        )
        PurchaseLine.objects.create(
            purchase=purchase,
            product=self.product,
            quantity=Decimal("1"),
            unit_price=Decimal("2.00"),
        )

        response = self.client.post(
            f"/api/achats/{purchase.pk}/transition/",
            {"status": Purchase.Status.RECEIVED},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], Purchase.Status.RECEIVED)
        self.assertEqual(response.data["received_date"], timezone.localdate().isoformat())

    def test_transition_backwards_clears_dates_of_later_stages(self):
        purchase = Purchase.objects.create(
            supplier=self.supplier,
            status=Purchase.Status.RECEIVED,
            planned_date="2026-10-01",
            ordered_date="2026-10-02",
            received_date="2026-10-03",
        )
        PurchaseLine.objects.create(
            purchase=purchase,
            product=self.product,
            quantity=Decimal("1"),
            unit_price=Decimal("2.00"),
        )

        response = self.client.post(
            f"/api/achats/{purchase.pk}/transition/",
            {"status": Purchase.Status.PLANNED},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["planned_date"], timezone.localdate().isoformat())
        self.assertIsNone(response.data["ordered_date"])
        self.assertIsNone(response.data["received_date"])

    def test_status_cannot_be_changed_through_regular_purchase_update(self):
        purchase = Purchase.objects.create(supplier=self.supplier)

        response = self.client.patch(
            f"/api/achats/{purchase.pk}/",
            {"status": Purchase.Status.RECEIVED},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        purchase.refresh_from_db()
        self.assertEqual(purchase.status, Purchase.Status.PLANNED)

    def test_new_purchase_defaults_planned_date_to_today(self):
        purchase = Purchase.objects.create(supplier=self.supplier)

        self.assertEqual(purchase.planned_date, timezone.localdate())

    def test_api_purchase_creation_defaults_planned_date_to_today(self):
        response = self.client.post(
            "/api/achats/",
            {
                "supplier": self.supplier.pk,
                "lines": [
                    {
                        "product": self.product.pk,
                        "quantity": "1",
                        "unit_price": "2.00",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["planned_date"], timezone.localdate().isoformat())

    def test_purchase_stage_date_can_be_edited_without_changing_status(self):
        purchase = Purchase.objects.create(supplier=self.supplier)

        response = self.client.patch(
            f"/api/achats/{purchase.pk}/",
            {"planned_date": "2026-10-20"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["planned_date"], "2026-10-20")
        self.assertEqual(response.data["status"], Purchase.Status.PLANNED)

    def test_future_received_date_is_rejected_by_api(self):
        purchase = Purchase.objects.create(supplier=self.supplier)
        future_date = (timezone.localdate() + timezone.timedelta(days=9)).isoformat()

        response = self.client.patch(
            f"/api/achats/{purchase.pk}/",
            {"received_date": future_date},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("received_date", response.data)
        purchase.refresh_from_db()
        self.assertIsNone(purchase.received_date)

    def test_technical_settings_default_and_update(self):
        get_response = self.client.get("/api/parametres-techniques/")
        put_response = self.client.put(
            "/api/parametres-techniques/",
            {"received_purchase_retention_days": 45},
            format="json",
        )

        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data["received_purchase_retention_days"], 30)
        self.assertEqual(put_response.status_code, 200)
        self.assertEqual(put_response.data["received_purchase_retention_days"], 45)
        self.assertEqual(
            TechnicalSettings.objects.get(pk=1).received_purchase_retention_days, 45
        )

    def test_technical_settings_reject_invalid_retention(self):
        response = self.client.put(
            "/api/parametres-techniques/",
            {"received_purchase_retention_days": 0},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_purchase_requires_at_least_one_line(self):
        response = self.client.post(
            "/api/achats/",
            {"supplier": self.supplier.pk, "lines": []},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("lines", response.data)

    def test_purchase_rejects_nonpositive_quantity(self):
        response = self.client.post(
            "/api/achats/",
            {
                "supplier": self.supplier.pk,
                "lines": [
                    {
                        "product": self.product.pk,
                        "quantity": "0",
                        "unit_price": "12.40",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("lines", response.data)

    def test_referenced_supplier_and_product_cannot_be_deleted(self):
        purchase = Purchase.objects.create(supplier=self.supplier)
        PurchaseLine.objects.create(
            purchase=purchase,
            product=self.product,
            quantity=Decimal("1"),
            unit_price=Decimal("2.00"),
        )

        supplier_response = self.client.delete(
            f"/api/fournisseurs/{self.supplier.pk}/"
        )
        product_response = self.client.delete(f"/api/produits/{self.product.pk}/")

        self.assertEqual(supplier_response.status_code, 400)
        self.assertEqual(product_response.status_code, 400)
        self.assertTrue(Supplier.objects.filter(pk=self.supplier.pk).exists())
        self.assertTrue(Product.objects.filter(pk=self.product.pk).exists())

    def test_supplier_and_product_endpoints_allow_basic_crud(self):
        supplier_response = self.client.get("/api/fournisseurs/")
        product_response = self.client.get("/api/produits/")

        self.assertEqual(supplier_response.status_code, 200)
        self.assertEqual(product_response.status_code, 200)
        self.assertEqual(supplier_response.data[0]["name"], self.supplier.name)
        self.assertEqual(product_response.data[0]["name"], self.product.name)
