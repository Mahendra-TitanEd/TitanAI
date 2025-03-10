"use client";

import useSWR, { useSWRConfig } from "swr";
import * as Yup from "yup";

import { LoadingAnimation } from "@/components/Loading";
import { GlobeIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ConnectorIndexingStatus, WebConfig } from "@/lib/types";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { linkCredential } from "@/lib/credential";

export default function Web() {
  const { mutate } = useSWRConfig();

  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher
  );

  const webIndexingStatuses: ConnectorIndexingStatus<WebConfig>[] =
    connectorIndexingStatuses?.filter(
      (connectorIndexingStatus) =>
        connectorIndexingStatus.connector.source === "web"
    ) ?? [];

  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <GlobeIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Web</h1>
      </div>
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Specify which websites to index
      </h2>
      <p className="text-sm mb-2">
        We re-fetch the latest state of the website once a day.
      </p>
      <div className="border-solid border-gray-600 border rounded-md p-6">
        <ConnectorForm<WebConfig>
          nameBuilder={(values) => `WebConnector-${values.base_url}`}
          source="web"
          inputType="load_state"
          formBody={
            <>
              <TextFormField name="base_url" label="URL to Index:" />
            </>
          }
          validationSchema={Yup.object().shape({
            base_url: Yup.string().required(
              "Please enter the website URL to scrape e.g. https://docs.titaned.com/"
            ),
          })}
          initialValues={{
            base_url: "",
          }}
          refreshFreq={60 * 60 * 24} // 1 day
          onSubmit={async (isSuccess, responseJson) => {
            if (isSuccess && responseJson) {
              // assumes there is a dummy credential with id 0
              await linkCredential(responseJson.id, 0);
              mutate("/api/manage/admin/connector/indexing-status");
            }
          }}
        />
      </div>

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Already Indexed Websites
      </h2>
      {isConnectorIndexingStatusesLoading ? (
        <LoadingAnimation text="Loading" />
      ) : isConnectorIndexingStatusesError || !connectorIndexingStatuses ? (
        <div>Error loading indexing history</div>
      ) : webIndexingStatuses.length > 0 ? (
        <ConnectorsTable<WebConfig, {}>
          connectorIndexingStatuses={webIndexingStatuses}
          specialColumns={[
            {
              header: "Base URL",
              key: "base_url",
              getValue: (connector) => (
                <a
                  className="text-blue-500"
                  href={connector.connector_specific_config.base_url}
                >
                  {connector.connector_specific_config.base_url}
                </a>
              ),
            },
          ]}
          onUpdate={() => mutate("/api/manage/admin/connector/indexing-status")}
        />
      ) : (
        <p className="text-sm">No indexed websites found</p>
      )}
    </div>
  );
}
