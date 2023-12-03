import { render } from 'preact';
import { App } from './components/app/app'

declare global {
  interface MIDIInputMap {
    readonly size: number;
    get(key: string): MIDIInput | undefined;
    entries(): IterableIterator<[string, MIDIInput]>;
  }
}

render(<App />, document.querySelector('#app')!)
