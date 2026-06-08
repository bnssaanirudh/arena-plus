import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_read_root():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert "ArenaPulse" in response.json()["message"]

@pytest.mark.asyncio
async def test_list_vendors():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/vendors/")
    assert response.status_code == 200
    vendors = response.json()
    assert len(vendors) == 50
    assert "vendor_id" in vendors[0]

@pytest.mark.asyncio
async def test_list_zones():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/zones/")
    assert response.status_code == 200
    zones = response.json()
    assert len(zones) == 7
    assert "North Gate" in zones
