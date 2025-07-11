import { useContext, useCallback } from "preact/hooks";
import { TransferQuantityContext } from "./TransferQuantityContext";
import { Item } from "../../scripts/items/types/Item";
import { isSimpleItem } from "../collection/utils/isSimpleItem";
import "./QuantityControls.css";

interface QuantityControlsProps {
  item: Item;
  duplicates?: Item[];
}

export function QuantityControls({ item, duplicates }: QuantityControlsProps) {
  const { getTransferQuantity, setTransferQuantity } = useContext(
    TransferQuantityContext
  );

  const totalQuantity = duplicates?.length || 0;
  const currentTransferQuantity = getTransferQuantity(item.code);
  // Default to total quantity if not set
  const displayQuantity =
    currentTransferQuantity > 0 ? currentTransferQuantity : totalQuantity;

  const handleInputChange = useCallback(
    (e: Event) => {
      const input = e.target as HTMLInputElement;
      const value = parseInt(input.value, 10);

      // If the value is NaN or negative, reset to 1
      if (isNaN(value) || value < 1) {
        input.value = "1";
        setTransferQuantity(item.code, 1);
        return;
      }

      // Cap at the total quantity
      const capped = Math.min(totalQuantity, value);

      // Always set the transfer quantity to what the user specified
      setTransferQuantity(item.code, capped);
    },
    [item.code, setTransferQuantity, totalQuantity]
  );

  const handleIncrement = useCallback(() => {
    const newQuantity = Math.min(displayQuantity + 1, totalQuantity);
    setTransferQuantity(item.code, newQuantity);
  }, [displayQuantity, totalQuantity, item.code, setTransferQuantity]);

  const handleDecrement = useCallback(() => {
    const newQuantity = Math.max(displayQuantity - 1, 1);
    setTransferQuantity(item.code, newQuantity);
  }, [displayQuantity, item.code, setTransferQuantity]);

  const handleSetToOne = useCallback(() => {
    setTransferQuantity(item.code, 1);
  }, [item.code, setTransferQuantity]);

  const handleSetToAll = useCallback(() => {
    setTransferQuantity(item.code, totalQuantity);
  }, [item.code, setTransferQuantity, totalQuantity]);

  // Only show controls for simple items with quantities
  if (!isSimpleItem(item) || !duplicates || duplicates.length <= 1) {
    return null;
  }

  return (
    <div className="quantity-controls">
      <input
        type="number"
        className="quantity-input"
        min={1}
        max={totalQuantity}
        value={displayQuantity}
        onInput={handleInputChange}
        aria-label="Selected quantity"
      />
      <span className="quantity-label">/ {totalQuantity}</span>
      <button
        className="quantity-btn quantity-btn-one"
        onClick={handleSetToOne}
        disabled={displayQuantity === 1}
        aria-label="Set quantity to 1"
      >
        1
      </button>
      <button
        className="quantity-btn quantity-btn-minus"
        onClick={handleDecrement}
        disabled={displayQuantity <= 1}
        aria-label="Decrease quantity"
      >
        -
      </button>
      <button
        className="quantity-btn quantity-btn-plus"
        onClick={handleIncrement}
        disabled={displayQuantity >= totalQuantity}
        aria-label="Increase quantity"
      >
        +
      </button>
      <button
        className="quantity-btn quantity-btn-all"
        onClick={handleSetToAll}
        disabled={displayQuantity === totalQuantity}
        aria-label="Set quantity to all"
      >
        All
      </button>
    </div>
  );
}
