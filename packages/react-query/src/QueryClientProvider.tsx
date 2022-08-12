import * as React from 'react'

import { QueryClient } from '@tanstack/query-core'
import { ContextOptions } from './types'

declare global {
  interface Window {
    ReactQueryClientContext?: React.Context<QueryClient | undefined>
    ReactQueryClientSharingContext?: React.Context<boolean>
  }
}

export const defaultContext = React.createContext<QueryClient | undefined>(
  undefined,
)

// If we are given a context, we will use it.
// Otherwise, if contextSharing is on, we share the first and at least one
// instance of the context across the window
// to ensure that if React Query is used across
// different bundles or microfrontends they will
// all use the same **instance** of context, regardless
// of module scoping.
function getQueryClientContext(
  context: React.Context<QueryClient | undefined> | undefined,
  contextSharing: boolean,
) {
  if (context) {
    return context
  }
  if (contextSharing && typeof window !== 'undefined') {
    if (!window.ReactQueryClientContext) {
      window.ReactQueryClientContext = defaultContext
    }

    return window.ReactQueryClientContext
  }

  return defaultContext
}

function getQueryClientSharingContext() {
  if (!window.ReactQueryClientSharingContext) {
    window.ReactQueryClientSharingContext = React.createContext<boolean>(false)
  }

  return window.ReactQueryClientSharingContext
}

const QueryClientSharingContext = getQueryClientSharingContext()

export const useQueryClient = ({ context }: ContextOptions = {}) => {
  const queryClient = React.useContext(
    getQueryClientContext(context, React.useContext(QueryClientSharingContext)),
  )

  if (!queryClient) {
    throw new Error('No QueryClient set, use QueryClientProvider to set one')
  }

  return queryClient
}

type QueryClientProviderPropsBase = {
  client: QueryClient
  children?: React.ReactNode
}
type QueryClientProviderPropsWithContext = ContextOptions & {
  contextSharing?: never
} & QueryClientProviderPropsBase
type QueryClientProviderPropsWithContextSharing = {
  context?: never
  contextSharing?: boolean
} & QueryClientProviderPropsBase

export type QueryClientProviderProps =
  | QueryClientProviderPropsWithContext
  | QueryClientProviderPropsWithContextSharing

export const QueryClientProvider = ({
  client,
  children,
  context,
  contextSharing = false,
}: QueryClientProviderProps): JSX.Element => {
  React.useEffect(() => {
    client.mount()
    return () => {
      client.unmount()
    }
  }, [client])

  const Context = getQueryClientContext(context, contextSharing)

  return (
    <QueryClientSharingContext.Provider value={!context && contextSharing}>
      <Context.Provider value={client}>{children}</Context.Provider>
    </QueryClientSharingContext.Provider>
  )
}
