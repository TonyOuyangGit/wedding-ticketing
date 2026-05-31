import { requireAdmin } from "@/lib/guards";
import {
  listAllUsers,
  listStages,
  listFieldDefinitions,
  getSetting,
} from "@/lib/queries";
import { DEFAULT_CONTRACT_HANDLER_KEY } from "@/lib/constants";
import {
  upsertUser,
  deleteUser,
  setDefaultContractHandler,
  createStage,
  updateStage,
  deleteStage,
  createField,
  updateField,
  deleteField,
} from "@/lib/admin";

const FIELD_TYPES = [
  "text",
  "number",
  "boolean",
  "select",
  "multiselect",
  "url",
  "date",
] as const;

export default async function AdminPage() {
  await requireAdmin();
  const [users, stages, fields, defaultContractHandlerId] = await Promise.all([
    listAllUsers(),
    listStages(),
    listFieldDefinitions(),
    getSetting(DEFAULT_CONTRACT_HANDLER_KEY),
  ]);

  return (
    <div>
      <h1 style={{ marginBottom: "1rem" }}>Admin settings</h1>

      {/* ---- Users / allowlist ---- */}
      <div className="card">
        <h2 style={{ marginBottom: "0.75rem" }}>Users (allowlist)</h2>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          Only users in this list (and marked active) can sign in.
        </p>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td colSpan={5} style={{ padding: 0 }}>
                  <form
                    action={upsertUser}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                      padding: "0.4rem 0.6rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <input type="hidden" name="email" value={u.email} />
                    <span style={{ flex: "2 1 200px", fontWeight: 600 }}>
                      {u.email}
                    </span>
                    <input
                      name="name"
                      defaultValue={u.name ?? ""}
                      placeholder="Name"
                      style={{ flex: "2 1 160px" }}
                    />
                    <select
                      name="role"
                      defaultValue={u.role}
                      style={{ flex: "1 1 110px" }}
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <label
                      style={{
                        display: "flex",
                        gap: "0.3rem",
                        alignItems: "center",
                        margin: 0,
                      }}
                    >
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={u.active}
                        style={{ width: "auto" }}
                      />
                      Active
                    </label>
                    <button type="submit">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form
          action={upsertUser}
          className="row"
          style={{ marginTop: "0.75rem", alignItems: "end" }}
        >
          <div className="field" style={{ flex: "2 1 200px", marginBottom: 0 }}>
            <label>Email *</label>
            <input name="email" type="email" required placeholder="person@example.com" />
          </div>
          <div className="field" style={{ flex: "2 1 160px", marginBottom: 0 }}>
            <label>Name</label>
            <input name="name" placeholder="Full name" />
          </div>
          <div className="field" style={{ flex: "1 1 110px", marginBottom: 0 }}>
            <label>Role</label>
            <select name="role" defaultValue="MEMBER">
              <option value="MEMBER">MEMBER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <label style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
            <input type="checkbox" name="active" defaultChecked style={{ width: "auto" }} />
            Active
          </label>
          <button type="submit" className="primary">
            Add user
          </button>
        </form>
      </div>

      {/* ---- Default contract handler ---- */}
      <div className="card">
        <h2 style={{ marginBottom: "0.75rem" }}>Default contract handler</h2>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          New and imported events are assigned this user as contract handler unless
          one is chosen explicitly.
        </p>
        <form
          action={setDefaultContractHandler}
          className="row"
          style={{ alignItems: "end" }}
        >
          <div className="field" style={{ flex: "2 1 240px", marginBottom: 0 }}>
            <label>Contract handler</label>
            <select name="userId" defaultValue={defaultContractHandlerId ?? ""}>
              <option value="">— None —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                  {u.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="primary">
            Save
          </button>
        </form>
      </div>

      {/* ---- Stages ---- */}
      <div className="card">
        <h2 style={{ marginBottom: "0.75rem" }}>Stages</h2>
        {stages.map((st) => {
          const save = updateStage.bind(null, st.id);
          const remove = deleteStage.bind(null, st.id);
          return (
            <div
              key={st.id}
              className="row"
              style={{ alignItems: "end", marginBottom: "0.5rem" }}
            >
              <form action={save} className="row" style={{ flex: 1, alignItems: "end" }}>
                <div className="field" style={{ flex: "2 1 160px", marginBottom: 0 }}>
                  <label>Name</label>
                  <input name="name" defaultValue={st.name} required />
                </div>
                <div className="field" style={{ flex: "1 1 90px", marginBottom: 0 }}>
                  <label>Order</label>
                  <input name="order" type="number" defaultValue={st.order} />
                </div>
                <div className="field" style={{ flex: "1 1 110px", marginBottom: 0 }}>
                  <label>Color</label>
                  <input name="color" type="text" defaultValue={st.color ?? ""} placeholder="#3b82f6" />
                </div>
                <button type="submit">Save</button>
              </form>
              <form action={remove}>
                <button type="submit" className="danger">
                  Delete
                </button>
              </form>
            </div>
          );
        })}

        <form action={createStage} className="row" style={{ marginTop: "0.75rem", alignItems: "end" }}>
          <div className="field" style={{ flex: "2 1 160px", marginBottom: 0 }}>
            <label>New stage name *</label>
            <input name="name" required placeholder="e.g. Booked" />
          </div>
          <div className="field" style={{ flex: "1 1 110px", marginBottom: 0 }}>
            <label>Color</label>
            <input name="color" placeholder="#3b82f6" />
          </div>
          <button type="submit" className="primary">
            Add stage
          </button>
        </form>
      </div>

      {/* ---- Custom fields ---- */}
      <div className="card">
        <h2 style={{ marginBottom: "0.75rem" }}>Custom fields</h2>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          For select / multiselect, enter options as a comma-separated list.
        </p>
        {fields.map((f) => {
          const save = updateField.bind(null, f.id);
          const remove = deleteField.bind(null, f.id);
          return (
            <div
              key={f.id}
              className="row"
              style={{ alignItems: "end", marginBottom: "0.5rem" }}
            >
              <form action={save} className="row" style={{ flex: 1, alignItems: "end" }}>
                <div className="field" style={{ flex: "0 0 auto", marginBottom: 0 }}>
                  <label>Key</label>
                  <code style={{ fontSize: "0.85rem" }}>{f.key}</code>
                </div>
                <div className="field" style={{ flex: "2 1 160px", marginBottom: 0 }}>
                  <label>Label</label>
                  <input name="label" defaultValue={f.label} required />
                </div>
                <div className="field" style={{ flex: "1 1 120px", marginBottom: 0 }}>
                  <label>Type</label>
                  <select name="type" defaultValue={f.type}>
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: "2 1 180px", marginBottom: 0 }}>
                  <label>Options</label>
                  <input name="options" defaultValue={f.options.join(", ")} placeholder="a, b, c" />
                </div>
                <div className="field" style={{ flex: "0 0 70px", marginBottom: 0 }}>
                  <label>Order</label>
                  <input name="order" type="number" defaultValue={f.order} />
                </div>
                <label style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    name="required"
                    defaultChecked={f.required}
                    style={{ width: "auto" }}
                  />
                  Req
                </label>
                <button type="submit">Save</button>
              </form>
              <form action={remove}>
                <button type="submit" className="danger">
                  Delete
                </button>
              </form>
            </div>
          );
        })}

        <form action={createField} className="row" style={{ marginTop: "0.75rem", alignItems: "end" }}>
          <div className="field" style={{ flex: "2 1 160px", marginBottom: 0 }}>
            <label>Label *</label>
            <input name="label" required placeholder="e.g. Recommended vendor" />
          </div>
          <div className="field" style={{ flex: "1 1 140px", marginBottom: 0 }}>
            <label>Key (optional)</label>
            <input name="key" placeholder="auto from label" />
          </div>
          <div className="field" style={{ flex: "1 1 120px", marginBottom: 0 }}>
            <label>Type</label>
            <select name="type" defaultValue="text">
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: "2 1 180px", marginBottom: 0 }}>
            <label>Options</label>
            <input name="options" placeholder="a, b, c" />
          </div>
          <label style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
            <input type="checkbox" name="required" style={{ width: "auto" }} />
            Req
          </label>
          <button type="submit" className="primary">
            Add field
          </button>
        </form>
      </div>

      {/* ---- Danger: delete users ---- */}
      <div className="card">
        <h2 style={{ marginBottom: "0.75rem" }}>Remove users</h2>
        <div className="row">
          {users.map((u) => {
            const remove = deleteUser.bind(null, u.id);
            return (
              <form key={u.id} action={remove}>
                <button type="submit" className="danger">
                  Remove {u.email}
                </button>
              </form>
            );
          })}
        </div>
      </div>
    </div>
  );
}
