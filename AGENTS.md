<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Pipeline stages, priorities, sources and money/follow-up rules live in `src/lib/pipeline.ts` as pure functions with tests in `src/lib/pipeline.test.ts` — keep business rules out of components so they stay testable.
- Board data is read/written from the browser with the generated Supabase client under RLS (team-shared: any signed-in user can read/write deals and activities); query/mutation hooks live in `src/lib/deals-api.ts`.
- Signed-in pages live under `src/routes/_authenticated/` (client-only `beforeLoad` gate redirecting to `/auth`); the board itself is `_authenticated/index.tsx`, so there is no top-level `src/routes/index.tsx`.
- Stage changes are recorded as `activities` rows of type `stage` by a database trigger (body `from>to`), not by client code.
