from rest_framework import serializers
from ..models import SearchProject, LiteratureRecord

class SearchProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchProject
        fields = '__all__'

class LiteratureRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiteratureRecord
        fields = '__all__'

class SearchQuerySerializer(serializers.Serializer):
    query = serializers.CharField(required=True)
    dbs = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=['PubMed']
    )
