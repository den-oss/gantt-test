let config = {
	sid: '00D6A0000002RdY!AR4AQCSntSrxxmM3ltbPb3LDLyJBsI5cyUn4gKHiNNmfHL7o.BlPhcO_vmVIVhSottlLVA2z5ab9CV3lL26lFgoxmf5jp7_k',
	port: (process.env.PORT ? process.env.PORT : 3000),
	sessionSecret: 'qwed2835676543543',
	users: {
		'denis': {
			login: 'denis',
			password: '123',
		},
	}
};

config.appQuery = '?projectId=a4G6A000000L4QFUA0&showHeader=false&sidebar=false&groupingType=ParentStageType%E2%80%8E'
 + "&sessionId=" + config.sid
;

module.exports = config;