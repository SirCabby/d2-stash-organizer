import { useState } from "preact/hooks";

// How much the arrow keys resize the column by, in pixels
const KEYBOARD_STEP = 10;

export interface ColumnResizerProps {
  // The column's name, for screen readers
  label: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  // Without a width, the column goes back to its default one
  onResize: (width?: number) => void;
}

interface Drag {
  // Where the pointer was when the drag started
  startX: number;
  // How much wider the column gets
  change: number;
  // The guide line's, down to the end of the table or of the window
  height: number;
}

/**
 * Handle on the right edge of a column's header. Drag it, or focus it and use
 * the arrow keys, to resize the column; double-click it to reset the column.
 * While dragging, a line shows where the edge will go: laying a big table out
 * again on every move would be too slow.
 */
export function ColumnResizer({
  label,
  width,
  minWidth,
  maxWidth,
  onResize,
}: ColumnResizerProps) {
  const [drag, setDrag] = useState<Drag>();

  const clamp = (newWidth: number) =>
    Math.min(Math.max(Math.round(newWidth), minWidth), maxWidth);

  const resize = (newWidth: number) => {
    newWidth = clamp(newWidth);
    if (newWidth !== width) {
      onResize(newWidth);
    }
  };

  return (
    <div
      class={`column-resizer ${drag ? "resizing" : ""}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize the ${label} column`}
      aria-valuenow={width}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuetext={`${width} pixels`}
      title="Drag to resize the column, double-click to reset it"
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }
        // Keeps the drag from selecting text
        event.preventDefault();
        // Keeps sending the moves here when the pointer leaves the handle
        event.currentTarget.setPointerCapture(event.pointerId);
        const { top } = event.currentTarget.getBoundingClientRect();
        const { bottom } = event.currentTarget
          .closest("table")!
          .getBoundingClientRect();
        setDrag({
          startX: event.clientX,
          change: 0,
          height: Math.min(bottom, window.innerHeight) - top,
        });
      }}
      onPointerMove={(event) => {
        if (drag) {
          const change = clamp(width + event.clientX - drag.startX) - width;
          if (change !== drag.change) {
            setDrag({ ...drag, change });
          }
        }
      }}
      onPointerUp={() => {
        if (drag) {
          resize(width + drag.change);
          setDrag(undefined);
        }
      }}
      onPointerCancel={() => setDrag(undefined)}
      onDblClick={() => onResize()}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          resize(width + (event.key === "ArrowLeft" ? -1 : 1) * KEYBOARD_STEP);
        }
      }}
    >
      {drag && (
        <div
          class="column-resize-guide"
          style={{
            height: `${drag.height}px`,
            transform: `translateX(${drag.change}px)`,
          }}
        />
      )}
    </div>
  );
}
