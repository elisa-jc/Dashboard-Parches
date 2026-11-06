<<<<<<< HEAD
USE parches;
GO

CREATE TABLE servers (
    serverid                 VARCHAR(10) NOT NULL PRIMARY KEY,
    osfamily                 VARCHAR(30),
    oslifecycle              VARCHAR(20),
    infrastructuretype       VARCHAR(20),
    assettype                VARCHAR(30),
    functionalrole           VARCHAR(40),
    environment              VARCHAR(20),
    regiongroup              VARCHAR(20),
    assetcriticality         VARCHAR(20),
    cpucapacityband          VARCHAR(20),
    memorycapacityband       VARCHAR(20),
    architectureband         VARCHAR(20),
    inventoryfreshnessband   VARCHAR(20),
    bootageband              VARCHAR(20),
    exposurecategory         VARCHAR(30),
    riskband                 VARCHAR(20),
    vulnerabilityvolumeband  VARCHAR(20)
);

CREATE TABLE findings (
    findingid               VARCHAR(15) NOT NULL PRIMARY KEY,
    serverid                VARCHAR(10) NOT NULL,
    vulnerabilitytypeid     VARCHAR(15),
    functionalcategory      VARCHAR(30),
    severity                TINYINT CHECK (severity BETWEEN 1 AND 5),
    findingstatus           VARCHAR(20),
    ageband                 VARCHAR(20),
    lastseenband            VARCHAR(20),
    detectionfrequencyband  VARCHAR(20),
    reopenband              VARCHAR(20),
    exploitabilitycategory  VARCHAR(30),
    malwareassociation      VARCHAR(30),
    complianceflag          VARCHAR(10),
    portcategory            VARCHAR(30),
    protocolcategory        VARCHAR(20),
    encryptioncontext       VARCHAR(10),
    remediationcategory     VARCHAR(30),
    slastatus               VARCHAR(30),
    assetcriticality        VARCHAR(20),
    findingriskband         VARCHAR(20),
    CONSTRAINT fk_findings_server FOREIGN KEY (serverid) REFERENCES servers(serverid)
);

CREATE INDEX ix_findings_server ON findings(serverid);
CREATE INDEX ix_findings_sla    ON findings(slastatus);
CREATE INDEX ix_findings_status ON findings(findingstatus);
=======
USE parches;
GO

CREATE TABLE servers (
    serverid                 VARCHAR(10) NOT NULL PRIMARY KEY,
    osfamily                 VARCHAR(30),
    oslifecycle              VARCHAR(20),
    infrastructuretype       VARCHAR(20),
    assettype                VARCHAR(30),
    functionalrole           VARCHAR(40),
    environment              VARCHAR(20),
    regiongroup              VARCHAR(20),
    assetcriticality         VARCHAR(20),
    cpucapacityband          VARCHAR(20),
    memorycapacityband       VARCHAR(20),
    architectureband         VARCHAR(20),
    inventoryfreshnessband   VARCHAR(20),
    bootageband              VARCHAR(20),
    exposurecategory         VARCHAR(30),
    riskband                 VARCHAR(20),
    vulnerabilityvolumeband  VARCHAR(20)
);

CREATE TABLE findings (
    findingid               VARCHAR(15) NOT NULL PRIMARY KEY,
    serverid                VARCHAR(10) NOT NULL,
    vulnerabilitytypeid     VARCHAR(15),
    functionalcategory      VARCHAR(30),
    severity                TINYINT CHECK (severity BETWEEN 1 AND 5),
    findingstatus           VARCHAR(20),
    ageband                 VARCHAR(20),
    lastseenband            VARCHAR(20),
    detectionfrequencyband  VARCHAR(20),
    reopenband              VARCHAR(20),
    exploitabilitycategory  VARCHAR(30),
    malwareassociation      VARCHAR(30),
    complianceflag          VARCHAR(10),
    portcategory            VARCHAR(30),
    protocolcategory        VARCHAR(20),
    encryptioncontext       VARCHAR(10),
    remediationcategory     VARCHAR(30),
    slastatus               VARCHAR(30),
    assetcriticality        VARCHAR(20),
    findingriskband         VARCHAR(20),
    CONSTRAINT fk_findings_server FOREIGN KEY (serverid) REFERENCES servers(serverid)
);

CREATE INDEX ix_findings_server ON findings(serverid);
CREATE INDEX ix_findings_sla    ON findings(slastatus);
CREATE INDEX ix_findings_status ON findings(findingstatus);
>>>>>>> 7a94fb9e507272fc472fc5d8d0790919c2361f34
GO