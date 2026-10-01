from django.db import migrations


def reconcile_emailotp_schema(apps, schema_editor):
    """Remove a legacy required column that is absent from the current model."""
    table = 'accounts_emailotp'
    with schema_editor.connection.cursor() as cursor:
        tables = schema_editor.connection.introspection.table_names(cursor)
        if table not in tables:
            return
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(cursor, table)
        }

    # Older databases used a required `attempt_count` column. The current model
    # uses `attempts_count`; the old column has no default and breaks inserts.
    if 'attempt_count' in columns and 'attempts_count' in columns:
        schema_editor.execute(f'ALTER TABLE {schema_editor.quote_name(table)} DROP COLUMN {schema_editor.quote_name("attempt_count")}')


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0004_emailotp'),
    ]

    operations = [
        migrations.RunPython(reconcile_emailotp_schema, migrations.RunPython.noop),
    ]
