from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from achats.models import Product, Purchase, PurchaseLine, Supplier


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ["id", "name", "email", "phone", "notes", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "reference",
            "unit",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PurchaseLineSerializer(serializers.ModelSerializer):
    quantity = serializers.DecimalField(
        max_digits=12, decimal_places=3, min_value=Decimal("0.001")
    )
    unit_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0.00")
    )
    product_name = serializers.CharField(source="product.name", read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseLine
        fields = ["id", "product", "product_name", "quantity", "unit_price", "line_total"]
        read_only_fields = ["id", "product_name", "line_total"]

    def get_line_total(self, instance):
        return instance.quantity * instance.unit_price


class PurchaseSerializer(serializers.ModelSerializer):
    lines = PurchaseLineSerializer(many=True, min_length=1)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Purchase
        fields = [
            "id",
            "supplier",
            "supplier_name",
            "status",
            "planned_date",
            "ordered_date",
            "received_date",
            "notes",
            "lines",
            "total",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "supplier_name", "total", "created_at", "updated_at"]

    def get_total(self, instance):
        return sum(
            (line.quantity * line.unit_price for line in instance.lines.all()),
            Decimal("0.00"),
        )

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop("lines")
        purchase = Purchase.objects.create(**validated_data)
        PurchaseLine.objects.bulk_create(
            [PurchaseLine(purchase=purchase, **line_data) for line_data in lines_data]
        )
        return purchase

    @transaction.atomic
    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if lines_data is not None:
            instance.lines.all().delete()
            PurchaseLine.objects.bulk_create(
                [
                    PurchaseLine(purchase=instance, **line_data)
                    for line_data in lines_data
                ]
            )
        return instance
