from django.db import models
from django.db.models import Q
from django.utils import timezone


class Supplier(models.Model):
    name = models.CharField("nom", max_length=200)
    email = models.EmailField("e-mail", blank=True)
    phone = models.CharField("téléphone", max_length=50, blank=True)
    notes = models.TextField("notes", blank=True)
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        ordering = ["name", "id"]
        verbose_name = "fournisseur"
        verbose_name_plural = "fournisseurs"

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField("nom", max_length=200)
    reference = models.CharField("référence", max_length=100, blank=True)
    unit = models.CharField("unité", max_length=50, default="pièce")
    description = models.TextField("description", blank=True)
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        ordering = ["name", "id"]
        verbose_name = "produit"
        verbose_name_plural = "produits"

    def __str__(self):
        return self.name


class Purchase(models.Model):
    class Status(models.TextChoices):
        PLANNED = "planned", "À prévoir"
        ORDERED = "ordered", "Commandé"
        RECEIVED = "received", "Reçu"

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchases",
        verbose_name="fournisseur",
    )
    status = models.CharField(
        "statut", max_length=20, choices=Status.choices, default=Status.PLANNED
    )
    planned_date = models.DateField(
        "date prévue", blank=True, null=True, default=timezone.localdate
    )
    ordered_date = models.DateField("date de commande", blank=True, null=True)
    received_date = models.DateField("date de réception", blank=True, null=True)
    notes = models.TextField("notes", blank=True)
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "achat"
        verbose_name_plural = "achats"

    def __str__(self):
        return f"Achat #{self.pk} — {self.supplier}"


class TechnicalSettings(models.Model):
    received_purchase_retention_days = models.PositiveIntegerField(
        "durée de conservation des achats reçus (jours)", default=30
    )

    class Meta:
        verbose_name = "paramètre technique"
        verbose_name_plural = "paramètres techniques"

    def __str__(self):
        return "Paramètres techniques"


class PurchaseLine(models.Model):
    purchase = models.ForeignKey(
        Purchase,
        on_delete=models.CASCADE,
        related_name="lines",
        verbose_name="achat",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="purchase_lines",
        verbose_name="produit",
    )
    quantity = models.DecimalField("quantité", max_digits=12, decimal_places=3)
    unit_price = models.DecimalField(
        "prix unitaire", max_digits=12, decimal_places=2
    )

    class Meta:
        ordering = ["id"]
        verbose_name = "ligne d'achat"
        verbose_name_plural = "lignes d'achat"
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0), name="purchase_line_quantity_positive"
            ),
            models.CheckConstraint(
                condition=Q(unit_price__gte=0), name="purchase_line_price_nonnegative"
            ),
        ]

    def __str__(self):
        return f"{self.product} × {self.quantity}"
