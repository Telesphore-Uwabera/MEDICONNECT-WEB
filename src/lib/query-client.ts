// import { QueryClient } from "@tanstack/react-query";

// export const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       // retry: 1,
//       // staleTime: Infinity,        
//       refetchOnWindowFocus: false,
//       refetchOnReconnect: false,
//     },
//     mutations: {
//       retry: false,
//     },
//   },
// });


// export const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       retry: 1,
//       staleTime: 1000 * 60 * 5,
//       refetchOnWindowFocus: false,
//     },
//     mutations: {
//       retry: false,
//     },
//   },
// });

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,   // ← add this
      staleTime: Infinity,     // ← and this
    },
    mutations: {
      retry: false,
    },
  },
});
