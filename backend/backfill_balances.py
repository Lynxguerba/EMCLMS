import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import StudentTransaction
from django.db.models import F

# Backfill existing charges
updated = StudentTransaction.objects.filter(transaction_type='Charge').update(remaining_balance=F('amount'))
print(f"Updated {updated} charges.")
