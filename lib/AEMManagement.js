const axios = require("axios");

// REVISIT: Maybe use `error` definitions as in req.error?

class AEMManagement {
  constructor({
    optionsManagement,
    queueConfig,
    queueName,
    optionsMessagingREST,
    optionsWebhook,
    path,
    optionsApp,
    subscribedTopics,
    maxRetries,
    subdomain,
    namespace,
    LOG,
  }) {
    this.subdomain = subdomain;
    this.options = optionsManagement;
    this.queueConfig = queueConfig;
    this.queueName = queueName;
    this.optionsMessagingREST = optionsMessagingREST;
    this.optionsWebhook = optionsWebhook;
    this.path = path;
    this.optionsApp = optionsApp;
    this.subscribedTopics = subscribedTopics;
    this.maxRetries = maxRetries === undefined ? 10 : maxRetries;
    this.subdomainInfo = this.subdomain ? `(subdomain: ${this.subdomain})` : "";
    this.namespace = namespace;
    this.LOG = LOG;
  }
  async getQueue(queueName = this.queueName) {
    this.LOG._info &&
      this.LOG.info(
        "Get queue",
        this.subdomain
          ? { queue: queueName, subdomain: this.subdomain }
          : { queue: queueName }
      );
    try {
      const res = await axios({
        method: "GET",
        url: `${this.options?.uri}/msgVpns/${
          this.options.msgVpnName
        }/queues/${encodeURIComponent(queueName)}`,
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
      });
      return res.data;
    } catch (e) {
      const error = new Error(
        `Queue "${queueName}" could not be retrieved ${this.subdomainInfo}`
      );
      error.code = "GET_QUEUE_FAILED";
      error.target = { kind: "QUEUE", queue: queueName };
      error.reason = e;
      this.LOG.error(error);
      throw error;
    }
  }

  async getQueues() {
    this.LOG._info &&
      this.LOG.info(
        "Get queues",
        this.subdomain ? { subdomain: this.subdomain } : {}
      );
    try {
      const res = await axios({
        method: "GET",
        url: `${this.options?.uri}/msgVpns/${this.options.msgVpnName}/queues`,
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
      });
      return res.data;
    } catch (e) {
      const error = new Error(
        `Queues could not be retrieved ${this.subdomainInfo}`
      );
      error.code = "GET_QUEUES_FAILED";
      error.target = { kind: "QUEUE" };
      error.reason = e;
      this.LOG.error(error);
      throw error;
    }
  }

  async createQueue(queueName = this.queueName) {
    this.LOG._info &&
      this.LOG.info(
        "Create queue",
        this.subdomain
          ? { queue: queueName, subdomain: this.subdomain }
          : { queue: queueName }
      );
    try {
      const queueConfig = this.queueConfig && { ...this.queueConfig };
      if (queueConfig?.deadMsgQueue)
        queueConfig.deadMsgQueue = queueConfig.deadMsgQueue.replace(
          /\$namespace/g,
          this.namespace
        );
      let currentQueue;
      try {
        currentQueue = await this.getQueue();
      } catch (error) {
        this.LOG.info(`Queue ${queueName} not exits, creating queue now`);
      }
      if (currentQueue) {
        return true;
      }
      const res = await axios({
        method: "POST",
        url: `${this.options?.uri}/msgVpns/${this.options.msgVpnName}/queues`,
        data: {
          accessType: "non-exclusive",
          permission: "modify-topic",
          egressEnabled: true,
          ingressEnabled: true,
          queueName,
        },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
      });
      if (res.statusCode === 201) return true;
    } catch (e) {
      const error = new Error(
        `Queue "${queueName}" could not be created ${this.subdomainInfo}`
      );
      error.code = "CREATE_QUEUE_FAILED";
      error.target = { kind: "QUEUE", queue: queueName };
      error.reason = e;
      this.LOG.error(error);
      throw error;
    }
  }

  async deleteQueue(queueName = this.queueName) {
    this.LOG._info &&
      this.LOG.info(
        "Delete queue",
        this.subdomain
          ? { queue: queueName, subdomain: this.subdomain }
          : { queue: queueName }
      );
    try {
      const res = await axios({
        method: "DELETE",
        url: `${this.options?.uri}/msgVpns/${
          this.options.msgVpnName
        }/queues/${encodeURIComponent(queueName)}`,
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
      });
      return res.data;
    } catch (e) {
      const error = new Error(
        `Queue "${queueName}" could not be deleted ${this.subdomainInfo}`
      );
      error.code = "DELETE_QUEUE_FAILED";
      error.target = { kind: "QUEUE", queue: queueName };
      error.reason = e;
      this.LOG.error(error);
      throw error;
    }
  }

  async getSubscriptions(queueName = this.queueName) {
    this.LOG._info &&
      this.LOG.info(
        "Get subscriptions",
        this.subdomain
          ? { queue: queueName, subdomain: this.subdomain }
          : { queue: queueName }
      );
    try {
      const res = await axios({
        method: "GET",
        url: `${this.options?.uri}/msgVpns/${
          this.options.msgVpnName
        }/queues/${encodeURIComponent(queueName)}/subscriptions`,
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
      });
      return res.data;
    } catch (e) {
      const error = new Error(
        `Subscriptions for "${queueName}" could not be retrieved ${this.subdomainInfo}`
      );
      error.code = "GET_SUBSCRIPTIONS_FAILED";
      error.target = { kind: "SUBSCRIPTION", queue: queueName };
      error.reason = e;
      this.LOG.error(error);
      throw error;
    }
  }

  async createSubscription(topicPattern, queueName = this.queueName) {
    this.LOG._info &&
      this.LOG.info(
        "Create subscription",
        this.subdomain
          ? { topic: topicPattern, queue: queueName, subdomain: this.subdomain }
          : { topic: topicPattern, queue: queueName }
      );
    try {
      let checkSubscriptionsExits;
      try {
        checkSubscriptionsExits = await axios({
          method: "GET",
          url: `${this.options?.uri}/msgVpns/${
            this.options.msgVpnName
          }/queues/${encodeURIComponent(
            queueName
          )}/subscriptions/${encodeURIComponent(topicPattern)}`,
          auth: {
            username: this.options.username,
            password: this.options.password,
          },
        });
      } catch (error) {}
      if (checkSubscriptionsExits) {
        return true;
      }
      const res = await axios({
        method: "POST",
        url: `${this.options?.uri}/msgVpns/${
          this.options.msgVpnName
        }/queues/${encodeURIComponent(queueName)}/subscriptions`,
        data: {
          subscriptionTopic: topicPattern,
        },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
      });
      if (res.statusCode === 200) return true;
    } catch (e) {
      const error = new Error(
        `Subscription "${topicPattern}" could not be added to queue "${queueName}" ${this.subdomainInfo}`
      );
      error.code = "CREATE_SUBSCRIPTION_FAILED";
      error.target = {
        kind: "SUBSCRIPTION",
        queue: queueName,
        topic: topicPattern,
      };
      error.reason = e;
      this.LOG.error(error);
      throw error;
    }
  }

  async deleteSubscription(topicPattern, queueName = this.queueName) {
    this.LOG._info &&
      this.LOG.info(
        "Delete subscription",
        this.subdomain
          ? { topic: topicPattern, queue: queueName, subdomain: this.subdomain }
          : { topic: topicPattern, queue: queueName }
      );
    try {
      const res = await axios({
        method: "DELETE",
        url: `${this.options?.uri}/msgVpns/${this.options.msgVpnName}/queues/${queueName}/subscriptions/${topicPattern}`,
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
      });
    } catch (e) {
      const error = new Error(
        `Subscription "${topicPattern}" could not be deleted from queue "${queueName}" ${this.subdomainInfo}`
      );
      error.code = "DELETE_SUBSCRIPTION_FAILED";
      error.target = {
        kind: "SUBSCRIPTION",
        queue: queueName,
        topic: topicPattern,
      };
      error.reason = e;
      this.LOG.error(error);
      throw error;
    }
  }

  async createQueueAndSubscriptions() {
    this.LOG._info &&
      this.LOG.info(`Create messaging artifacts ${this.subdomainInfo}`);

    const created = await this.createQueue();
    if (!created) {
      // We need to make sure to only keep our own subscriptions
      const resGet = await this.getSubscriptions();
      if (Array.isArray(resGet)) {
        const existingSubscriptions = resGet.map((s) => s.topicPattern);
        const obsoleteSubs = existingSubscriptions.filter(
          (s) => !this.subscribedTopics.has(s)
        );
        const additionalSubs = [...this.subscribedTopics]
          .map((kv) => kv[0])
          .filter((s) => !existingSubscriptions.some((e) => s === e));
        const unchangedSubs = [];
        // eslint-disable-next-line no-unused-vars
        for (const [s, _] of this.subscribedTopics) {
          if (existingSubscriptions.some((e) => s === e)) unchangedSubs.push(s);
        }
        this.LOG._info &&
          this.LOG.info(
            "Unchanged subscriptions",
            unchangedSubs,
            " ",
            this.subdomainInfo
          );
        await Promise.all([
          ...obsoleteSubs.map((s) => this.deleteSubscription(s)),
          ...additionalSubs.map(async (t) => this.createSubscription(t)),
        ]);
        return;
      }
    }
    await Promise.all(
      [...this.subscribedTopics]
        .map((kv) => kv[0])
        .map((t) => this.createSubscription(t))
    );
  }

  async deploy() {
    await this.createQueueAndSubscriptions();
  }
}

module.exports = AEMManagement;
