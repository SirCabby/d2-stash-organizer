import {
  d2rStashName,
  isCharacter,
  isD2rStash,
  isPlugyStash,
  ItemsOwner,
  NON_PLUGY_SHARED_STASH_NAME,
  PLUGY_SHARED_STASH_NAME,
} from "../../scripts/save-file/ownership";

export function PrettyOwnerName({ owner }: { owner: ItemsOwner }) {
  if (isPlugyStash(owner)) {
    if (owner.personal) {
      return (
        <>
          <span class="unique">{owner.filename.slice(0, -4)}</span>'s stash
        </>
      );
    } else {
      return (
        <span class="magic">
          {owner.nonPlugY
            ? NON_PLUGY_SHARED_STASH_NAME
            : PLUGY_SHARED_STASH_NAME}
        </span>
      );
    }
  } else if (isCharacter(owner)) {
    return <span class="unique">{owner.filename.slice(0, -4)}</span>;
  } else if (isD2rStash(owner)) {
    return <span class="magic">{d2rStashName(owner.filename)}</span>;
  } else {
    return <span class="magic">{owner.filename}</span>;
  }
}
