const AMQPWebhookMessaging = require("@sap/cds/libx/_runtime/messaging/AMQPWebhookMessaging");
const AMQPClient = require('@sap/cds/libx/_runtime/messaging//common-utils/AMQPClient.js')
const AEMManagement = require("./AEMManagement");
const cloudEvents = require("@sap/cds/libx/_runtime/messaging/enterprise-messaging-utils/cloudEvents.js");

class EnterpriseMessagingAEM extends AMQPWebhookMessaging {
  async init() {
    await super.init();
    await this.getClient().connect();
    cloudEvents.defaultOptions(this.options);
  }

  getClient() {
    if (this.client) return this.client;
    const optionsAMQP = {
      uri: [this.options.credentials.url],
      sasl: {
        user: this.options.credentials.username,
        password: this.options.credentials.password,
        mechanism: "PLAIN",
      },
    };
    if (this.options.amqp) {
      optionsAMQP.amqp = this.options.amqp;
    }
    this.client = new AMQPClient({
      optionsAMQP,
      prefix: { topic: "topic://", queue: "queue://" },
      service: this,
    });
    return this.client;
  }

  getManagement() {
    if (this.management) return this.management;
    const optsManagement = this.options.credentials.management;
    const queueConfig = this.queueConfig;
    const queueName = this.queueName;
    this.management = new AEMManagement({
      optionsManagement: optsManagement,
      queueConfig,
      queueName,
      subscribedTopics: this.subscribedTopics,
      alternativeTopics: this.alternativeTopics,
      namespace: this.options.credentials && this.options.credentials.namespace,
      LOG: this.LOG,
    });
    return this.management;
  }

  wildcarded(topic) {
    return topic.replace(/.*?\/.*?\/.*?\//, "+/+/+/");
  }

  prepareTopic(topic, inbound) {
    return cloudEvents.prepareTopic(
      topic,
      inbound,
      this.options,
      super.prepareTopic.bind(this)
    );
  }

  prepareHeaders(headers, event) {
    cloudEvents.prepareHeaders(
      headers,
      event,
      this.options,
      super.prepareHeaders.bind(this)
    );
  }
}

module.exports = EnterpriseMessagingAEM;
