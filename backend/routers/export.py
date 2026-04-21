from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from sqlmodel import Session
from models import Product
from database import get_session
from services.export_service import build_excel, build_csv

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/{product_id}/excel")
def export_excel(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(404, f"Продукт {product_id} не найден")

    data     = build_excel(product)
    filename = f"product_{product_id}.xlsx"
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{product_id}/csv")
def export_csv(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(404, f"Продукт {product_id} не найден")

    data     = build_csv(product)
    filename = f"product_{product_id}.csv"
    return Response(
        content=data.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
