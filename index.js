System.register("forth", [], function (exports_1, context_1) {
    "use strict";
    var RESERVED_WORDS, ForthMachine;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            RESERVED_WORDS = [
                '+',
                '-',
                '*',
                '/',
                'dup',
            ];
            ForthMachine = class ForthMachine {
                static getElseOrEnd(tokens, index) {
                    let nestedIfCount = 0;
                    while (index < tokens.length - 1) {
                        const token = tokens[++index];
                        switch (token) {
                            case 'if?':
                                nestedIfCount++;
                                break;
                            case 'else':
                            case 'end':
                                if (nestedIfCount === 0) {
                                    return index;
                                }
                                if (token === 'end') {
                                    nestedIfCount--;
                                }
                                break;
                        }
                    }
                    throw new Error('Could not find matching else/end for if');
                }
                static getEnd(tokens, index) {
                    let nestedIfCount = 0;
                    while (index < tokens.length - 1) {
                        const token = tokens[++index];
                        switch (token) {
                            case 'if?':
                                nestedIfCount++;
                                break;
                            case 'end':
                                if (nestedIfCount === 0) {
                                    return index;
                                }
                                nestedIfCount--;
                        }
                    }
                    throw new Error('Could not find matching end for else');
                }
                static formatStackValue(value) {
                    if (Array.isArray(value)) {
                        return `[${value.map(ForthMachine.formatStackValue).join(', ')}]`;
                    }
                    if (typeof value === 'number') {
                        return String(value);
                    }
                    return `:${value}`;
                }
                constructor(syscalls = {}) {
                    this.syscalls = syscalls;
                    this.stack = [];
                    this.variables = {};
                    this.functions = {};
                    this.syscallArgs = {
                        pop: () => this.pop(),
                        push: value => this.push(value),
                        variable: name => {
                            if (name in this.variables) {
                                return this.variables[name];
                            }
                            throw new Error(`Syscall error: no variable named ${name}`);
                        },
                        num: value => {
                            if (typeof value === 'number') {
                                return value;
                            }
                            throw new Error(`Expected a number, got ${typeof value}`);
                        },
                        execute: script => this.execute(script),
                    };
                }
                execute(input) {
                    const tokens = input.trim().replace(/\([^)]+\)/g, '').split(/\s+/);
                    let index = -1;
                    while (index < tokens.length - 1) {
                        index++;
                        const token = tokens[index];
                        if (token.match(/^\d+$/)) {
                            this.stack.push(Number.parseInt(token, 10));
                            continue;
                        }
                        if (token.startsWith('0x')) {
                            this.stack.push(Number.parseInt(token.slice(2), 16));
                            continue;
                        }
                        switch (token) {
                            case '+':
                                this.push(this.num() + this.num());
                                break;
                            case '-': {
                                const b = this.num(), a = this.num();
                                this.push(a - b);
                                break;
                            }
                            case '*':
                                this.push(this.num() * this.num());
                                break;
                            case '/': {
                                const b = this.num(), a = this.num();
                                this.push(a / b);
                                break;
                            }
                            case 'pop':
                                this.pop();
                                break;
                            case 'dup': {
                                const value = this.pop();
                                this.push(value);
                                this.push(value);
                                break;
                            }
                            case 'swap': {
                                const a = this.pop();
                                const b = this.pop();
                                this.push(a);
                                this.push(b);
                                break;
                            }
                            case 'if?': {
                                const value = this.pop();
                                let truthy = false;
                                if (typeof value === 'number' && value > 0) {
                                    truthy = true;
                                }
                                if (value === true) {
                                    truthy = true;
                                }
                                if (!truthy) {
                                    index = ForthMachine.getElseOrEnd(tokens, index);
                                }
                                break;
                            }
                            case 'else': {
                                index = ForthMachine.getEnd(tokens, index);
                                break;
                            }
                            case 'var': {
                                const varName = tokens[++index];
                                if (!varName) {
                                    throw new Error('Expected a variable name after var');
                                }
                                if (RESERVED_WORDS.includes(varName)) {
                                    throw new Error(`${varName} is a reserved word`);
                                }
                                this.variables[varName] = 0;
                                break;
                            }
                            case 'fn': {
                                const fnName = tokens[++index];
                                const fnStartIndex = index + 1;
                                if (!fnName.endsWith('()')) {
                                    throw new Error(`Function ${fnName} must end in ()`);
                                }
                                index = ForthMachine.getEnd(tokens, index);
                                this.functions[fnName] = tokens.slice(fnStartIndex, index).join(' ');
                                break;
                            }
                            case 'end': {
                                break;
                            }
                            case 'debug': {
                                console.log({
                                    variables: this.variables,
                                    functions: this.functions,
                                });
                                break;
                            }
                            case 'index': {
                                const index = this.num();
                                const list = this.list();
                                this.push(list[index] ?? 0);
                                break;
                            }
                            case 'length': {
                                this.push(this.list().length);
                                break;
                            }
                            case ':true': {
                                this.push(true);
                                break;
                            }
                            case ':false': {
                                this.push(false);
                                break;
                            }
                            default:
                                if (token.endsWith('!')) {
                                    const varName = token.slice(0, -1);
                                    if (varName in this.variables) {
                                        this.variables[varName] = this.pop();
                                    }
                                    else {
                                        throw new Error(`Unknown variable ${varName}`);
                                    }
                                }
                                else if (token.endsWith('()')) {
                                    if (token in this.syscalls) {
                                        this.syscalls[token](this.syscallArgs);
                                    }
                                    else if (token in this.functions) {
                                        this.execute(this.functions[token]);
                                    }
                                    else {
                                        throw new Error(`Unknown function ${token}`);
                                    }
                                }
                                else if (token in this.variables) {
                                    this.push(this.variables[token]);
                                }
                                else {
                                    throw new Error(`Unknown word ${token}`);
                                }
                        }
                    }
                    return this.stack.map(ForthMachine.formatStackValue).join(' ');
                }
                pop() {
                    const value = this.stack.pop();
                    if (value === undefined) {
                        throw new Error('Stack underflow');
                    }
                    return value;
                }
                push(value) {
                    this.stack.push(value);
                }
                num() {
                    const value = this.pop();
                    if (typeof value === 'number') {
                        return value;
                    }
                    throw new Error(`Expected number, got ${typeof value}`);
                }
                list() {
                    const value = this.pop();
                    if (Array.isArray(value)) {
                        return value;
                    }
                    throw new Error(`Expected list, got ${typeof value}`);
                }
            };
            exports_1("ForthMachine", ForthMachine);
        }
    };
});
System.register("index", ["forth"], function (exports_2, context_2) {
    "use strict";
    var forth_1, canvas, button, state, buttons, keys, buttonCodes, notes, connectMidi, midiOutput, execute, handleMIDIMessage;
    var __moduleName = context_2 && context_2.id;
    return {
        setters: [
            function (forth_1_1) {
                forth_1 = forth_1_1;
            }
        ],
        execute: function () {
            canvas = document.querySelector('[data-canvas]').getContext('2d');
            button = document.querySelector('[data-script-execute]');
            state = {
                x: 0,
                y: 0,
            };
            buttons = {
                up: false,
                down: false,
                left: false,
                right: false,
                a: false,
                b: false,
                c: false,
                d: false,
            };
            keys = {
                ArrowUp: 'up',
                ArrowDown: 'down',
                ArrowLeft: 'left',
                ArrowRight: 'right',
                x: 'a',
                z: 'b',
                s: 'c',
                a: 'd',
            };
            buttonCodes = ['up', 'down', 'left', 'right', 'a', 'b', 'c', 'd'];
            notes = new Set();
            connectMidi = false;
            window.addEventListener('keydown', event => {
                if (event.code in keys) {
                    buttons[keys[event.code]] = true;
                }
            });
            window.addEventListener('keyup', event => {
                if (event.code in keys) {
                    buttons[keys[event.code]] = false;
                }
            });
            execute = (script) => {
                const forth = new forth_1.ForthMachine({
                    'pixel()': ({ variable, num, pop }) => {
                        canvas.fillStyle = `#${num(pop()).toString(16).padStart(6, '0')}`;
                        canvas.fillRect(num(variable('screen/x')), num(variable('screen/y')), 1, 1);
                    },
                    'rect()': ({ variable, num, pop }) => {
                        canvas.fillStyle = `#${pop().toString(16).padStart(6, '0')}`;
                        canvas.fillRect(num(variable('screen/x')), num(variable('screen/y')), num(variable('screen/w')), num(variable('screen/h')));
                    },
                    'cls()': () => {
                        canvas.clearRect(0, 0, 128, 128);
                    },
                    'btn()': ({ pop, num, push }) => {
                        const code = buttonCodes[num(pop())];
                        push(buttons[code]);
                    },
                    'notes()': ({ push }) => {
                        push([...notes]);
                    },
                    'connect_midi()': () => {
                        connectMidi = true;
                    },
                });
                forth.execute(`
    var screen/x
    var screen/y
    var screen/w
    var screen/h

    var tv/w 128 tv/w!
    var tv/h 128 tv/h!

    var btn/up 0 btn/up!
    var btn/down 1 btn/down!
    var btn/left 2 btn/left!
    var btn/right 3 btn/right!
    var btn/a 4 btn/a!
    var btn/b 5 btn/b!
    var btn/c 6 btn/c!
    var btn/d 7 btn/d!

    fn xy()
      screen/y! screen/x!
    end

    fn wh()
      screen/h! screen/w!
    end
  `);
                forth.execute(script);
                let oldButtonText = button.textContent;
                button.textContent = 'Stop';
                const draw = () => {
                    forth.execute('game()');
                    window.requestAnimationFrame(draw);
                };
                const handle = window.requestAnimationFrame(draw);
                button.addEventListener('click', () => {
                    button.textContent = oldButtonText;
                    window.cancelAnimationFrame(handle);
                }, {
                    once: true,
                });
            };
            button.addEventListener('click', () => {
                const script = document.querySelector('[data-script-input]')?.value;
                if (!script) {
                    return;
                }
                try {
                    const output = document.querySelector('[data-script-output]');
                    if (output) {
                        execute(script);
                    }
                }
                catch (error) {
                    if (error instanceof Error) {
                        console.log(`Error: ${error.message}`);
                    }
                }
            });
            handleMIDIMessage = (event) => {
                const NOTE_ON = 9;
                const NOTE_OFF = 8;
                const command = event.data[0] >> 4;
                const pitch = event.data[1];
                const velocity = event.data.length > 2 ? event.data[2] : 1;
                if (command === NOTE_OFF || (command === NOTE_ON && velocity === 0)) {
                    notes.delete(pitch);
                }
                else if (command === NOTE_ON) {
                    notes.add(pitch);
                }
                if (connectMidi) {
                    midiOutput?.send(event.data);
                }
            };
            document.querySelector('[data-connecti-midi]')?.addEventListener('click', () => {
                navigator.requestMIDIAccess().then(midi => {
                    let input;
                    console.log({ midi });
                    midi.inputs.forEach(inp => {
                        inp.onmidimessage = event => handleMIDIMessage(event);
                    });
                    midi.outputs.forEach(out => {
                        midiOutput = out;
                    });
                });
            });
        }
    };
});
