import { downloadExcel, downloadCsv } from "../api/export";

/**
 * ExportButton — кнопки скачивания Excel и CSV карточки товара.
 * Props:
 *   productId  – id продукта
 *   disabled   – bool
 */
export default function ExportButton({ productId, disabled = false }) {
  if (!productId) return null;

  return (
    <div className="export-buttons">
      <button
        className="btn btn-secondary"
        onClick={() => downloadExcel(productId)}
        disabled={disabled}
        title="Скачать Excel"
      >
        📥 Excel
      </button>
      <button
        className="btn btn-secondary"
        onClick={() => downloadCsv(productId)}
        disabled={disabled}
        title="Скачать CSV"
      >
        📄 CSV
      </button>
    </div>
  );
}
