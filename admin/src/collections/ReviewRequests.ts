import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { auditHooks } from '../access/audit'
import { activeAuthenticated, canCreateReviewRequest, canUpdateReviewRequest, deny } from '../access/collectionAccess'
import { hasCapability, isActiveAdmin } from '../access/hasCapability'

const audit = auditHooks('review-requests')

function relationshipId(value: unknown): unknown {
  if (value && typeof value === 'object' && 'id' in value) return value.id
  return value
}

function sameRelationship(left: unknown, right: unknown): boolean {
  return relationshipId(left) === relationshipId(right)
}

export const enforceReviewRequestPolicy: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  const actor = req.user as { id?: string | number } | undefined
  if (!isActiveAdmin(actor) || actor.id === undefined || actor.id === null) {
    throw new Error('An active actor is required for review requests')
  }

  if (operation === 'create') {
    if (data.reviewer !== undefined && !sameRelationship(data.reviewer, actor.id)) {
      throw new Error('Review request reviewer must be the active actor')
    }
    data.reviewer = actor.id
    return data
  }

  for (const field of ['product', 'requester', 'reviewer', 'comment'] as const) {
    if (data[field] !== undefined && !sameRelationship(data[field], originalDoc?.[field])) {
      throw new Error(`Review request ${field} is immutable`)
    }
  }

  const nextState = data.state ?? originalDoc?.state ?? 'open'
  if (originalDoc?.state === 'resolved') {
    if (nextState !== 'resolved') {
      throw new Error('Resolved review requests cannot be reopened')
    }
    if (!sameRelationship(originalDoc.reviewer, actor.id) && !hasCapability(actor, 'user.manage')) {
      throw new Error('Only the assigned reviewer may resolve a review request')
    }
    for (const field of ['resolvedAt', 'resolvedBy', 'resolution'] as const) {
      if (data[field] !== undefined && !sameRelationship(data[field], originalDoc[field])) {
        throw new Error(`Review request ${field} is immutable after resolution`)
      }
      data[field] = originalDoc[field]
    }
    return data
  }
  if (nextState === 'resolved') {
    if (!sameRelationship(originalDoc?.reviewer, actor.id) && !hasCapability(actor, 'user.manage')) {
      throw new Error('Only the assigned reviewer may resolve a review request')
    }
    if (data.resolvedBy !== undefined && !sameRelationship(data.resolvedBy, actor.id)) {
      throw new Error('Review request resolvedBy must be the active actor')
    }
    const resolution = data.resolution ?? originalDoc?.resolution
    if (typeof resolution !== 'string' || !resolution.trim()) {
      throw new Error('Resolution metadata is required when resolving a review request')
    }
    data.resolvedBy = actor.id
    data.resolvedAt = new Date().toISOString()
  }
  return data
}

export const ReviewRequests: CollectionConfig = {
  slug: 'review-requests',
  access: {
    create: canCreateReviewRequest,
    delete: deny,
    read: activeAuthenticated,
    update: canUpdateReviewRequest,
  },
  admin: {
    defaultColumns: ['product', 'requester', 'reviewer', 'state', 'resolvedAt'],
    description: 'Theo dõi các yêu cầu rà soát và trạng thái xử lý dữ liệu danh mục.',
    group: 'Danh mục',
    listSearchableFields: ['product', 'requester', 'reviewer', 'state'],
    pagination: { defaultLimit: 25, limits: [25, 50, 100] },
    useAsTitle: 'comment',
  },
  labels: { singular: 'Yêu cầu rà soát', plural: 'Yêu cầu rà soát' },
  hooks: { afterChange: audit.afterChange, afterDelete: audit.afterDelete, beforeChange: [enforceReviewRequestPolicy] },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true, index: true },
    { name: 'requester', type: 'relationship', relationTo: 'admins', required: true, index: true },
    { name: 'reviewer', type: 'relationship', relationTo: 'admins', required: true, index: true },
    { name: 'comment', type: 'textarea', required: true },
    { name: 'state', type: 'select', required: true, index: true, defaultValue: 'open', options: ['open', 'resolved'] },
    { name: 'resolvedAt', type: 'date', index: true },
    { name: 'resolvedBy', type: 'relationship', relationTo: 'admins', index: true },
    { name: 'resolution', type: 'textarea' },
  ],
}
