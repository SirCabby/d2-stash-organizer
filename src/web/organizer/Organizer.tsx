import { useCallback, useContext, useState } from "preact/hooks";
import { CollectionContext } from "../store/CollectionContext";
import { SettingsContext } from "../settings/SettingsContext";
import { organize } from "../../scripts/grail/organize";
import { ExternalLink } from "../routing/ExternalLink";
import "./Organizer.css";
import { numberInputChangeHandler } from "./numberInputChangeHandler";
import { OwnerSelector } from "../save-files/OwnerSelector";
import { useUpdateCollection } from "../store/useUpdateCollection";
import {
  isPlugyStash,
  isStash,
  ItemsOwner,
} from "../../scripts/save-file/ownership";
import { updateCharacterStashes } from "../store/plugyDuplicates";

export function Organizer() {
  const { lastActivePlugyStashPage, hasPlugY, hasD2rStash } =
    useContext(CollectionContext);
  const {
    organizerSkipPages: skipPages,
    setOrganizerSkipPages: setSkipPages,
    organizerEmptyPages: emptyPages,
    setOrganizerEmptyPages: setEmptyPages,
  } = useContext(SettingsContext);
  const { updateSingleFile, rollback } = useUpdateCollection();

  const [stash, setStash] = useState<ItemsOwner>();

  const handleOrganize = useCallback(async () => {
    if (stash && isStash(stash)) {
      try {
        organize(stash, [], skipPages, emptyPages);
        if (lastActivePlugyStashPage && isPlugyStash(stash)) {
          updateCharacterStashes(lastActivePlugyStashPage);
        }
        await updateSingleFile(stash);
      } catch (e) {
        if (e instanceof Error) {
          await rollback();
          setStash(undefined);
          alert(e.message);
        } else {
          throw e;
        }
      }
    }
  }, [
    stash,
    skipPages,
    emptyPages,
    lastActivePlugyStashPage,
    updateSingleFile,
    rollback,
  ]);

  if (!hasPlugY && !hasD2rStash) {
    return (
      <p>
        This feature requires{" "}
        <ExternalLink href="http://plugy.free.fr/">
          PlugY's extended stash
        </ExternalLink>{" "}
        or a D2R shared stash file. It allows you to organize your collection
        across multiple pages in just one click.
      </p>
    );
  }

  return (
    <>
      <p>Select a stash to organize:</p>
      <OwnerSelector selected={stash} onChange={setStash} onlyStashes={true} />
      <p>
        <label>
          Do not touch the first{" "}
          <input
            type="number"
            min={0}
            max={99}
            value={skipPages}
            onChange={numberInputChangeHandler(setSkipPages)}
          />{" "}
          page{skipPages === 1 ? "" : "s"}.
        </label>
      </p>
      <p>
        <label>
          Leave{" "}
          <input
            type="number"
            min={0}
            max={99}
            value={emptyPages}
            onChange={numberInputChangeHandler(setEmptyPages)}
          />{" "}
          empty page{emptyPages === 1 ? "" : "s"} at the start.
        </label>
      </p>
      <p>
        <button class="button" disabled={!stash} onClick={handleOrganize}>
          Organize my stash
        </button>
      </p>
    </>
  );
}
