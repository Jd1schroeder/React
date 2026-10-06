---
name: domain
description: Preserve Workbench maintenance-workflow terminology and page behavior when extending the product domain.
---

# Domain Skill

Related Patterns: [categorized remote inbox](../../patterns/frontend/categorized-remote-inbox.md), [organization administration pages](../../patterns/frontend/organization-administration.md), [secure attachment workflow](../../patterns/data-access/secure-attachment-workflow.md).

Related Decisions: [004](../../decisions/004-signup-organization-provisioning.md), [005](../../decisions/005-organization-roles-and-permissions.md), [008](../../decisions/008-work-order-creation-and-persistence.md), [009](../../decisions/009-work-order-inbox-query-and-review-state.md).

Workbench models facility maintenance workflows. Current domain examples include work orders, requests, assets, preventive maintenance plans, meters, reporting, automations, inventory, locations, teams, users, vendors, and library templates.

Use the existing terms and status vocabulary in `src/pages/WorkOrders.jsx`. Work Orders are the most detailed domain flow and should remain the reference for status, priority, requester, assignment, due date, and detail-pane presentation.

Work Order comments are internal collaboration, while the activity feed records Work Order creation, status changes, and edits. Authors may edit their own comment text and delete their own comments; Organization Admins may delete comments from any member. Show an Edited marker after text changes and retain deleted comments as redacted tombstones in the feed. Request-submission and request-lifecycle history belongs to the Requests module, not the Work Order activity feed.
