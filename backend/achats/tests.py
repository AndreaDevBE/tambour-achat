from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from achats.models import Product, Purchase, PurchaseLine, Supplier


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

    def test_purchase_status_can_be_changed_without_enforcing_a_sequence(self):
        purchase = Purchase.objects.create(
            supplier=self.supplier, status=Purchase.Status.PLANNED
        )
        PurchaseLine.objects.create(
            purchase=purchase,
            product=self.product,
            quantity=Decimal("1"),
            unit_price=Decimal("2.00"),
        )

        response = self.client.patch(
            f"/api/achats/{purchase.pk}/",
            {"status": Purchase.Status.RECEIVED},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], Purchase.Status.RECEIVED)

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
