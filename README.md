
# simpleState

javascript state management that is:
* minimal ~ there is only 3 properties
* tiny ~ only 1.8kb
* reactive ~ fully reactive to state changes with help of 'subscribe' method
* performant ~ you can subscribe to a part of the state and intercept its changes

```js
class SimpleState<T extends object>{
    get data(): T;
    unsubscribe(callbackFn: Subscriber): void;
    subscribe<G = T>(selectorString: string & NestedKeyOf<T>, callbackFn: Subscriber<G>): Subscriber<G>;
}
```
```js
import { SimpleState } from "@arashes/simplestate";

const store = new SimpleState({
    personalInfo: {
        name: "",
    },
});

input.addEventListener("input", (evt) => {
    const name = (evt.target as HTMLInputElement).value as string;
    store.data.personalInfo.name = name;
});


store.subscribe<string>("personalInfo.name", (name) => {
            inputShow.innerHTML = name;
            // runs on every input changes
});

```
