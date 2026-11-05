USE parches;
GO

CREATE TABLE servers (
    server_id                 VARCHAR(10) NOT NULL PRIMARY KEY,
    os_family                 VARCHAR(30),
    os_lifecycle              VARCHAR(20),
    infrastructure_type       VARCHAR(20),
    asset_type                VARCHAR(30),
    functional_role           VARCHAR(40),
    environment               VARCHAR(20),
    region_group              VARCHAR(20),
    asset_criticality         VARCHAR(20),
    cpu_capacity_band         VARCHAR(20),
    memory_capacity_band      VARCHAR(20),
    architecture_band         VARCHAR(20),
    inventory_freshness_band  VARCHAR(20),
    boot_age_band             VARCHAR(20),
    exposure_category         VARCHAR(30),
    risk_band                 VARCHAR(20),
    vulnerability_volume_band VARCHAR(20)
);

CREATE TABLE findings (
    finding_id               VARCHAR(15) NOT NULL PRIMARY KEY,
    server_id                VARCHAR(10) NOT NULL,
    vulnerability_type_id    VARCHAR(15),
    functional_category      VARCHAR(30),
    severity                 TINYINT CHECK (severity BETWEEN 1 AND 5),
    finding_status           VARCHAR(20),
    age_band                 VARCHAR(20),
    last_seen_band           VARCHAR(20),
    detection_frequency_band VARCHAR(20),
    reopen_band              VARCHAR(20),
    exploitability_category  VARCHAR(30),
    malware_association      VARCHAR(30),
    compliance_flag          VARCHAR(10),
    port_category            VARCHAR(30),
    protocol_category        VARCHAR(20),
    encryption_context       VARCHAR(10),
    remediation_category     VARCHAR(30),
    sla_status               VARCHAR(30),
    asset_criticality        VARCHAR(20),
    finding_risk_band        VARCHAR(20),
    CONSTRAINT fk_findings_server FOREIGN KEY (server_id) REFERENCES servers(server_id)
);

CREATE INDEX ix_findings_server ON findings(server_id);
CREATE INDEX ix_findings_sla    ON findings(sla_status);
CREATE INDEX ix_findings_status ON findings(finding_status);
GO