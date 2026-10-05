# Pattern Index

Patterns are evidence-backed implementation recipes. Load a Pattern only when the task matches its use case; source code remains the authority for current behavior.

## Frontend

| Pattern                                                                      | Use it for                                                                             | Canonical implementation                                                                        |
|------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| [Panel page and route](frontend/panel-page-and-route.md)                     | Adding a route-backed page using the shared Workbench panel shell or list/detail view. | `src/components/layout/PanelLayout.jsx`, `PanelView.jsx`, `src/routes/routeConfig.jsx`          |
| [Application shell and settings](frontend/application-shell-and-settings.md) | Sidebar, authenticated shell, settings navigation, or settings-page scroll behavior.   | `src/components/layout/AppLayout.jsx`, `Sidebar.jsx`, `src/pages/settings/SettingsLayout.jsx`   |
| [Categorized remote inbox](frontend/categorized-remote-inbox.md)             | A categorized record list with server counts, paging, lazy expansion, and prefetch.    | `src/pages/work-orders/WorkOrderList.jsx`, `src/services/workOrderService.js`                   |
| [Work Order form and detail](frontend/work-order-form-and-detail.md)         | Work Order creation fields/layout, attachments, and permission-aware record details.   | `src/pages/work-orders/NewWorkOrderForm.jsx`, `WorkOrderDetail.jsx`, `src/pages/WorkOrders.jsx` |
| [Organization administration pages](frontend/organization-administration.md) | User, team, invitation, role, and organization-settings screens.                       | `src/pages/UsersPage.jsx`, `src/pages/settings/ManageTeammatesPage.jsx`, `RolesPage.jsx`        |
| [Shared UI controls](frontend/shared-ui-controls.md)                         | Forms, tables, selectors, images, and other reusable controls.                         | `src/components/ui/`                                                                            |

## Data access

| Pattern                                                                 | Use it for                                                             | Canonical implementation                                                           |
|-------------------------------------------------------------------------|------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| [Supabase service boundary](data-access/supabase-service-boundary.md)   | Reading or mutating persisted data from a feature.                     | `src/services/workOrderService.js`, `organizationService.js`                       |
| [Secure attachment workflow](data-access/secure-attachment-workflow.md) | Uploading private files together with a multi-record create operation. | `src/services/workOrderService.js`, `create_work_order_with_assignments` migration |

## Security

| Pattern                                                                    | Use it for                                                | Canonical implementation                                                          |
|----------------------------------------------------------------------------|-----------------------------------------------------------|-----------------------------------------------------------------------------------|
| [Permissioned feature boundary](security/permissioned-feature-boundary.md) | Adding permission-aware UI and protected data operations. | `src/services/permissionCatalog.js`, `authorizationService.js`, Supabase RLS/RPCs |
