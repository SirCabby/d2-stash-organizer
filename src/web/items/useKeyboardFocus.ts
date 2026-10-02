import { useRef, useState } from "preact/hooks";
import { JSX } from "preact";

// Whether an item's name has keyboard focus, which shows its card like hovering
// the name does. Clicking the name focuses it too, but then the card must close
// once the mouse leaves. This is decided when the name gets focus, because the
// browser counts any key pressed afterwards as keyboard focus, even Shift for a
// range selection, so :focus-within and :focus-visible would leave it open.
export function useKeyboardFocus() {
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  // Leaving the window blurs the name but leaves it the active element, and
  // coming back focuses it again: the card stays as it was.
  const windowBlurred = useRef(false);
  const focusHandlers = {
    onFocus: ({ currentTarget }: JSX.TargetedFocusEvent<HTMLElement>) => {
      if (!windowBlurred.current) {
        setKeyboardFocus(currentTarget.matches(":focus-visible"));
      }
      windowBlurred.current = false;
    },
    onBlur: ({ currentTarget }: JSX.TargetedFocusEvent<HTMLElement>) => {
      windowBlurred.current = document.activeElement === currentTarget;
      if (!windowBlurred.current) {
        setKeyboardFocus(false);
      }
    },
    // Clicking a name that already has keyboard focus hands its card back to
    // the mouse.
    onMouseDown: () => setKeyboardFocus(false),
  };
  return [keyboardFocus, focusHandlers] as const;
}
