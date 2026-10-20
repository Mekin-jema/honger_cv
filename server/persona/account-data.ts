import "server-only";
import { cache } from "react";
import { listOwnedPersonas, loadDraft, loadVersion } from "./repo";

export const getAccountOwnedPersonas = cache(listOwnedPersonas);
export const getAccountDraft = cache(loadDraft);
export const getAccountVersion = cache(loadVersion);
