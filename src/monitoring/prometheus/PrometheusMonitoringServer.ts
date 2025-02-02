import { Application, NextFunction, Request, Response } from 'express';
import { ServerAction, ServerType } from '../../types/Server';

import ExpressUtils from '../../server/ExpressUtils';
import Logging from '../../utils/Logging';
import MonitoringConfiguration from '../../types/configuration/MonitoringConfiguration';
import MonitoringServer from '../MonitoringServer';
import { ServerUtils } from '../../server/ServerUtils';
import client from 'prom-client';

const MODULE_NAME = 'PrometheusMonitoringServer';

export default class PrometheusMonitoringServer extends MonitoringServer {
  private monitoringConfig: MonitoringConfiguration;
  private expressApplication: Application;

  public constructor(monitoringConfig: MonitoringConfiguration) {
    super();
    // Keep params
    this.monitoringConfig = monitoringConfig;
    // Create a Registry which registers the metrics
    const register = new client.Registry();
    // Add a default label which is added to all metrics
    register.setDefaultLabels({
      app: 'e-Mobility'
    });
    // Enable the collection of default metrics
    client.collectDefaultMetrics({
      register,
    });
    // Create HTTP Server
    this.expressApplication = ExpressUtils.initApplication();
    // Handle requests
    this.expressApplication.use(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      '/metrics', async (req: Request, res: Response, next: NextFunction) => {
        // Trace Request
        await Logging.traceExpressRequest(req, res, next, ServerAction.MONITORING);
        // Process
        res.setHeader('Content-Type', register.contentType);
        res.end(await register.metrics());
        next();
        // Trace Response
        Logging.traceExpressResponse(req, res, next, ServerAction.MONITORING);
      }
    );
    // Post init
    ExpressUtils.postInitApplication(this.expressApplication);
  }

  public start(): void {
    ServerUtils.startHttpServer(this.monitoringConfig,
      ServerUtils.createHttpServer(this.monitoringConfig, this.expressApplication), MODULE_NAME, ServerType.MONITORING_SERVER);
  }
}
