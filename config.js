let config = {
	ganttSid: '00D6A0000002RdY!AR4AQCSntSrxxmM3ltbPb3LDLyJBsI5cyUn4gKHiNNmfHL7o.BlPhcO_vmVIVhSottlLVA2z5ab9CV3lL26lFgoxmf5jp7_k',
	ganttProjId: 'a4G6A000000L4QFUA0',
	port: (process.env.PORT ? process.env.PORT : 3000),
	sessionSecret: 'qwed2835676543543',
	sessionKey: 'express.sid',
	users: {
		'denis': {
			login: 'denis',
			password: '123',
		},
		'yishay': {
			login: 'yishay',
			password: '123',
		},
		'rami': {
			login: 'rami',
			password: '123',
		},
	}
};

config.appQuery = '?projectId='+config.ganttProjId+'&showHeader=false&sidebar=false&groupingType=ParentStageType%E2%80%8E'
 + "&sessionId=" + config.ganttSid
;

module.exports = config;