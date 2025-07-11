import { grailSummary } from "../../scripts/grail/list/grailProgress";
import { useContext, useMemo } from "preact/hooks";
import { CollectionContext } from "../store/CollectionContext";

export function GrailSummary() {
  const { allItems } = useContext(CollectionContext);

  const { nbNormal, totalNormal, nbEth, totalEth, nbPerfect, nbPerfectEth } =
    useMemo(() => grailSummary(allItems), [allItems]);

  return (
    <div>
      <div style={{ 
        display: "flex", 
        gap: "0", 
        marginBottom: "0.5em",
        alignItems: "center"
      }}>
        <span style={{ 
          borderRight: "1px solid #666666",
          paddingRight: "2em" 
        }}>
          Normal Grail: {nbNormal} / {totalNormal}
        </span>
        <span style={{ 
          borderRight: "1px solid #666666", 
          paddingRight: "2em",
          paddingLeft: "2em"
        }}>
          Perfect Grail: {nbPerfect} / {totalNormal}
        </span>
        <span style={{ 
          borderRight: "1px solid #666666", 
          paddingRight: "2em",
          paddingLeft: "2em"
        }}>
          Ethereal Grail: {nbEth} / {totalEth}
        </span>
        <span style={{ paddingLeft: "2em" }}>
          Perfect Eth Grail: {nbPerfectEth} / {totalEth}
        </span>
      </div>
    </div>
  );
}
