from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView

from achats.models import Product, Purchase, Supplier, TechnicalSettings
from achats.serializers import (
    ProductSerializer,
    PurchaseSerializer,
    PurchaseTransitionSerializer,
    SupplierSerializer,
    TechnicalSettingsSerializer,
)


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

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        purchase = self.get_object()
        serializer = PurchaseTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        date_fields = {
            Purchase.Status.PLANNED: "planned_date",
            Purchase.Status.ORDERED: "ordered_date",
            Purchase.Status.RECEIVED: "received_date",
        }
        status_order = list(date_fields)
        current_index = status_order.index(purchase.status)
        new_index = status_order.index(new_status)

        setattr(purchase, date_fields[new_status], timezone.localdate())
        if new_index < current_index:
            for status in status_order[new_index + 1 :]:
                setattr(purchase, date_fields[status], None)
        purchase.status = new_status
        purchase.save()
        return Response(PurchaseSerializer(purchase).data)


class TechnicalSettingsView(APIView):
    def get(self, request):
        settings, _ = TechnicalSettings.objects.get_or_create(pk=1)
        return Response(TechnicalSettingsSerializer(settings).data)

    def put(self, request):
        settings, _ = TechnicalSettings.objects.get_or_create(pk=1)
        serializer = TechnicalSettingsSerializer(settings, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
