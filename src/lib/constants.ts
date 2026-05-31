// Sentinel <select> value meaning "this ticket has an imported MC/DJ/contract
// handler name that isn't a registered user — keep that name, don't assign a
// user". Shared between TicketForm (the option value) and the ticket server
// actions (which interpret it on submit).
export const KEEP_IMPORTED_NAME = "__keep_imported_name__";

// Setting key under which the admin-chosen default contract handler user id is
// stored (Setting model). New/imported tickets default their contract handler
// to this user when none is otherwise specified.
export const DEFAULT_CONTRACT_HANDLER_KEY = "defaultContractHandlerId";
