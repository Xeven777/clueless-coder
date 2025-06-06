import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
})

export const QueryProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
