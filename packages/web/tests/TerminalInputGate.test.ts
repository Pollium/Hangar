import assert from 'node:assert/strict';
import test from 'node:test';
import TerminalInputGate from '#terminal-input-gate';

test('queues input until ready and sends later input immediately', () => {
    const sent: string[] = [];
    const gate = new TerminalInputGate((data) => {
        sent.push(data);
        return true;
    });

    gate.push('a');
    gate.push('b');
    assert.deepEqual(sent, []);

    gate.open();
    assert.deepEqual(sent, ['ab']);

    gate.push('c');
    assert.deepEqual(sent, ['ab', 'c']);
});

test('blocks across rejoin and bounds or clears pending input', () => {
    const sent: string[] = [];
    const gate = new TerminalInputGate((data) => {
        sent.push(data);
        return true;
    }, 4);

    gate.open();
    gate.push('live');
    gate.block();
    gate.push('123');
    gate.push('456');
    gate.open();
    assert.deepEqual(sent, ['live', '3456']);

    gate.block(true);
    gate.push('drop');
    gate.block(true);
    gate.open();
    assert.deepEqual(sent, ['live', '3456']);
});

test('requeues input when the transport rejects a send', () => {
    const sent: string[] = [];
    let available = true;
    const gate = new TerminalInputGate((data) => {
        if(!available) return false;
        sent.push(data);
        return true;
    });

    gate.open();
    available = false;
    gate.push('during-close');
    assert.deepEqual(sent, []);

    available = true;
    gate.open();
    assert.deepEqual(sent, ['during-close']);
});
