from datetime import datetime, timedelta, timezone

import pytest

from app.respuestas import normalizar_fecha


def test_sin_zona_se_asume_bolivia():
    f = normalizar_fecha(datetime(2026, 3, 5, 14, 30))
    assert f.isoformat() == "2026-03-05T14:30:00-04:00"


def test_con_zona_se_respeta():
    f = normalizar_fecha(datetime(2026, 3, 5, 18, 30, tzinfo=timezone.utc))
    assert f.utcoffset() == timedelta(0)


def test_fecha_futura_se_rechaza():
    with pytest.raises(ValueError):
        normalizar_fecha(datetime.now(timezone.utc) + timedelta(days=1))


def test_texto_se_rechaza():
    with pytest.raises(ValueError):
        normalizar_fecha("5/3/2026 14:30")
