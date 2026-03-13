from django.urls import path
from .views import (FederatedSearchView, SaveRecordsView, DeduplicateRecordsView, 
                    DashboardStatsView, ImportedRecordsView,
                    ScreeningPendingView, RctPredictView, RctDecisionView,
                    RctIncludedListView, PicoExtractView,
                    FulltextEligibleListView, FulltextScreenView, FulltextDecisionView)

urlpatterns = [
    path('federated_search/', FederatedSearchView.as_view(), name='federated_search'),
    path('save_records/', SaveRecordsView.as_view(), name='save_records'),
    path('deduplicate/', DeduplicateRecordsView.as_view(), name='deduplicate'),
    path('dashboard_stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('imported_records/', ImportedRecordsView.as_view(), name='imported_records'),
    path('screening_pending/', ScreeningPendingView.as_view(), name='screening_pending'),
    path('rct_predict/', RctPredictView.as_view(), name='rct_predict'),
    path('rct_decision/', RctDecisionView.as_view(), name='rct_decision'),
    path('rct_included/', RctIncludedListView.as_view(), name='rct_included'),
    path('pico_extract/', PicoExtractView.as_view(), name='pico_extract'),
    path('fulltext_eligible/', FulltextEligibleListView.as_view(), name='fulltext_eligible'),
    path('fulltext_screen/', FulltextScreenView.as_view(), name='fulltext_screen'),
    path('fulltext_decision/', FulltextDecisionView.as_view(), name='fulltext_decision'),
]
