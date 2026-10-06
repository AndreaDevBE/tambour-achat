from django.urls import include, path
from rest_framework.routers import DefaultRouter

from achats.views import ProductViewSet, PurchaseViewSet, SupplierViewSet


router = DefaultRouter()
router.register("fournisseurs", SupplierViewSet)
router.register("produits", ProductViewSet)
router.register("achats", PurchaseViewSet)

urlpatterns = [
    path("api/", include(router.urls)),
]
