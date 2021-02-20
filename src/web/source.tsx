/* @jsx h */
import { h, ComponentType } from 'preact'
import { useState, useRef, useEffect, StateUpdater } from 'preact/hooks'
import { runTranspile, Result } from '.'

export const SourcePanel: ComponentType<{
  setResult: StateUpdater<Result | null>
}> = ({ setResult }) => {
  const ref = useRef<HTMLTextAreaElement>()
  const [source, setSource] = useState(localStorage.getItem('source') ?? '')

  const run = () => setResult(runTranspile(source))

  useEffect(() => {
    // inintial props.value won't be rendered when hydrating
    if (ref.current) ref.current.value = source
  }, [])

  const onKeydown = ({ code, metaKey }: KeyboardEvent) => {
    if (code === 'Enter' && metaKey && ref.current) {
      setResult(runTranspile(ref.current.value))
    }
  }
  useEffect(() => {
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [source])

  return (
    <div id="source" class="container">
      <h2 class="subtitle">source</h2>
      <textarea
        ref={ref}
        class="textarea is-primary is-family-code"
        placeholder="Your VCL"
        rows={20}
        value={source}
        onInput={({ target }) => {
          // preact's event type is incompatible
          const value = ((target as unknown) as { value: string })?.value
          setSource(value)
          localStorage.setItem('source', value)
        }}
      />
      <button class="button" onClick={run}>
        Transpile
      </button>
    </div>
  )
}
