from django.db.models.deletion import ProtectedError
from rest_framework.exceptions import ValidationError
from rest_framework.viewsets import ModelViewSet

from achats.models import Product, Purchase, Supplier
from achats.serializers import ProductSerializer, PurchaseSerializer, SupplierSerializer


class ProtectedDeleteMixin:
    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError as exc:
            raise ValidationError(
                {"detail": "Cet enregistrement est utilisé par un achat existant."}
            ) from exc


class SupplierViewSet(ProtectedDeleteMixin, ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer


class ProductViewSet(ProtectedDeleteMixin, ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


class PurchaseViewSet(ModelViewSet):
    queryset = Purchase.objects.prefetch_related("lines__product").select_related(
        "supplier"
    )
    serializer_class = PurchaseSerializer
