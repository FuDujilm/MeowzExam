import { ProxyAgent } from 'undici'

type GlobalState = typeof globalThis & {
  __proxyFetchPatched?: boolean
}

const proxyUrl =
  process.env.OAUTH_HTTP_PROXY ??
  process.env.HTTPS_PROXY ??
  process.env.https_proxy ??
  process.env.HTTP_PROXY ??
  process.env.http_proxy ??
  process.env.ALL_PROXY ??
  process.env.all_proxy

const shouldPatch =
  Boolean(proxyUrl) &&
  typeof globalThis.fetch === 'function' &&
  !(globalThis as GlobalState).__proxyFetchPatched

if (shouldPatch && proxyUrl) {
  const proxyAgent = new ProxyAgent(proxyUrl)
  const originalFetch = globalThis.fetch.bind(globalThis)

  globalThis.fetch = (async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => {
    const dispatcherInit =
      init && (init as Record<string, unknown>).dispatcher
        ? init
        : { ...(init ?? {}), dispatcher: proxyAgent }

    return originalFetch(input, dispatcherInit)
  }) as typeof fetch

  ;(globalThis as GlobalState).__proxyFetchPatched = true

  if (process.env.NODE_ENV !== 'production') {
    console.info('[network] fetch proxy enabled:', proxyUrl)
  }
}
