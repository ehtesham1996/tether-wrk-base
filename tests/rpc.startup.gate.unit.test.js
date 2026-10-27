'use strict'

const test = require('brittle')
const RpcStartupGate = require('../workers/lib/rpc.startup.gate')

test('incoming connections wait until startup completes', async t => {
  const gate = new RpcStartupGate()
  let settled = false
  const pending = gate.isBlocked().finally(() => { settled = true })
  await new Promise(resolve => setImmediate(resolve))
  t.is(settled, false)
  gate.open()
  t.is(await pending, false)
  t.is(await gate.isBlocked(), false)
})

test('shutdown releases waiting peers and late startup cannot reopen the gate', async t => {
  const gate = new RpcStartupGate()
  const pending = [gate.isBlocked(), gate.isBlocked()]
  gate.close()
  t.alike(await Promise.all(pending), [true, true])
  gate.open()
  t.is(await gate.isBlocked(), true)
})

test('shutdown blocks new handshakes after successful startup', async t => {
  const gate = new RpcStartupGate()
  gate.open()
  t.is(await gate.isBlocked(), false)
  gate.close()
  t.is(await gate.isBlocked(), true)
})

test('startup releases all waiting connections', async t => {
  const gate = new RpcStartupGate()
  const pending = Array.from({ length: 10 }, () => gate.isBlocked())
  gate.open()
  t.alike(await Promise.all(pending), Array(10).fill(false))
})
