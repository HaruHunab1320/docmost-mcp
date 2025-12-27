# UI Audit Route Checks (Table)

Use this table to log pass/fail quickly during runtime verification.

| Route | Steps | Expected | Result | Notes |
| --- | --- | --- | --- | --- |
| `/auth/setup` | Create workspace + admin | Redirect to app shell | [ ] Pass [ ] Fail |  |
| `/login` | Login valid + invalid | Redirect / error state | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId` | Load + open sidebar | Header + nav OK | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId/inbox` | Quick capture + filters | Task appears + filters | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId/today` | Daily pulse + approvals | Buttons open + list loads | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId/triage` | Bulk actions | Tasks updated | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId/review` | Toggle + review page | Persist + open page | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId/waiting` | Return to inbox | Task moved | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId/someday` | Return to inbox | Task moved | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId/projects` | Create/open project | List updates + open | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId/projects?projectId=...` | Board + drawer | DnD + edits persist | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId/pages/:pageId` | Edit + comment + history | Persist + history | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId/attachments` | Upload/download/delete | List updates | [ ] Pass [ ] Fail |  |
| `/spaces/:spaceId/search` | Query + open result | Results + open | [ ] Pass [ ] Fail |  |
| `/settings/account` | Update profile | Persist after reload | [ ] Pass [ ] Fail |  |
| `/settings/workspace` | Toggle autonomy | Persist + visible | [ ] Pass [ ] Fail |  |
| `/settings/api-keys` | Create/delete key | List updates | [ ] Pass [ ] Fail |  |
