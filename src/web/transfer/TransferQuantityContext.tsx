import { createContext, RenderableProps } from "preact";
import { useCallback, useMemo, useState } from "preact/hooks";

interface TransferQuantityContext {
  transferQuantities: Map<string, number>;
  setTransferQuantity(itemCode: string, quantity: number): void;
  getTransferQuantity(itemCode: string): number;
  resetQuantities(): void;
}

export const TransferQuantityContext = createContext<TransferQuantityContext>({
  transferQuantities: new Map(),
  setTransferQuantity: () => undefined,
  getTransferQuantity: () => 0,
  resetQuantities: () => undefined,
});

export function TransferQuantityProvider({
  children,
}: RenderableProps<unknown>) {
  const [transferQuantities, setTransferQuantities] = useState(
    new Map<string, number>()
  );

  const setTransferQuantity = useCallback(
    (itemCode: string, quantity: number) => {
      setTransferQuantities((previous) => {
        const newQuantities = new Map(previous);
        if (quantity <= 0) {
          newQuantities.delete(itemCode);
        } else {
          newQuantities.set(itemCode, quantity);
        }
        return newQuantities;
      });
    },
    []
  );

  const getTransferQuantity = useCallback(
    (itemCode: string): number => {
      return transferQuantities.get(itemCode) || 0;
    },
    [transferQuantities]
  );

  const resetQuantities = useCallback(() => {
    setTransferQuantities(new Map());
  }, []);

  const value = useMemo(
    () => ({
      transferQuantities,
      setTransferQuantity,
      getTransferQuantity,
      resetQuantities,
    }),
    [
      transferQuantities,
      setTransferQuantity,
      getTransferQuantity,
      resetQuantities,
    ]
  );

  return (
    <TransferQuantityContext.Provider value={value}>
      {children}
    </TransferQuantityContext.Provider>
  );
}
