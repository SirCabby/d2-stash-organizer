import { grailSummary } from "../../scripts/grail/list/grailProgress";
import { useContext, useMemo } from "preact/hooks";
import { CollectionContext } from "../store/CollectionContext";

export function GrailSummary() {
  const { allItems } = useContext(CollectionContext);

  const { nbNormal, totalNormal, nbEth, totalEth, nbPerfect, nbPerfectEth } =
    useMemo(() => grailSummary(allItems), [allItems]);

  return (
    <div>
      <p>
        Normal Grail: {nbNormal} / {totalNormal}
      </p>
      <p>
        Perfect Grail: {nbPerfect} / {totalNormal}
      </p>
      <p>
        Ethereal Grail: {nbEth} / {totalEth}
      </p>
      <p>
        Perfect Eth Grail: {nbPerfectEth} / {totalEth}
      </p>
    </div>
  );
}
