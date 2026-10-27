'use strict'

const NetFacility = require('@tetherto/hp-svc-facs-net')
const RpcStartupGate = require('./rpc.startup.gate')

class StartupNetFacility extends NetFacility {
  constructor (caller, opts, ctx) {
    super(caller, opts, ctx)
    this._startupGate = new RpcStartupGate()
    this._onWorkerStarted = () => {
      if (caller.stopping) return this.closeRpcStartup()
      this._startupGate.open()
    }
    if (caller.stopping) this.closeRpcStartup()
    else caller.once('started', this._onWorkerStarted)
  }

  _configuredFirewall () {
    const { allow, allowReadOnly } = this.conf
    const allowedPeers = (allow || allowReadOnly) ? [...(allow || []), ...(allowReadOnly || [])] : null
    return this.buildFirewall(allowedPeers)
  }

  async startRpcServer (keyPair = null, serverOpts = {}) {
    const firewall = serverOpts.firewall || this._configuredFirewall()
    return super.startRpcServer(keyPair, {
      ...serverOpts,
      firewall: async (...args) => {
        if (await firewall(...args)) return true
        return this._startupGate.isBlocked()
      }
    })
  }

  closeRpcStartup () {
    this.caller.removeListener('started', this._onWorkerStarted)
    this._startupGate.close()
  }

  _stop (cb) {
    this.closeRpcStartup()
    super._stop(cb)
  }
}

module.exports = StartupNetFacility
