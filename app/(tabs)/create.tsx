import PickerScreen from "../create/picker";
import TypePickerScreen from "../create/type-picker";
import { isMusicPromoOnlyLaunch } from "@/lib/launchScope";

export default function CreateScreen() {
  if (isMusicPromoOnlyLaunch()) {
    return <PickerScreen tabEmbedded />;
  }
  return <TypePickerScreen tabEmbedded />;
}
