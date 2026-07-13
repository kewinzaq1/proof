import { lazy, Suspense } from 'react'

const isDemo = window.location.pathname.replace(/\/$/, '').endsWith('/demo')
const Page = isDemo
  ? lazy(() => import('./Demo.jsx'))
  : lazy(() => import('./Landing.jsx'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  )
}
