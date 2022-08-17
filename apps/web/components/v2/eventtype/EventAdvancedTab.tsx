import autoAnimate from "@formkit/auto-animate";
import { EventTypeCustomInput, EventTypeCustomInputType } from "@prisma/client/";
import { EventTypeSetupInfered, FormValues } from "pages/v2/event-types/[type]";
import { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import {
  Button,
  Switch,
  Tooltip,
  Dialog,
  DialogContent,
  Label,
  TextField,
  showToast,
  DestinationCalendarSelector,
  CustomInputItem,
} from "@calcom/ui/v2";

import CustomInputTypeForm from "@components/v2/eventtype/CustomInputTypeForm";

const generateHashedLink = (id: number) => {
  const translator = short();
  const seed = `${id}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
  return uid;
};

export const EventAdvancedTab = ({ eventType, team }: Pick<EventTypeSetupInfered, "eventType" | "team">) => {
  const connectedCalendarsQuery = trpc.useQuery(["viewer.connectedCalendars"]);
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [showEventNameTip, setShowEventNameTip] = useState(false);
  const [hashedLinkVisible, setHashedLinkVisible] = useState(!!eventType.hashedLink);
  const [hashedUrl, setHashedUrl] = useState(eventType.hashedLink?.link);
  const [customInputs, setCustomInputs] = useState<EventTypeCustomInput[]>(
    eventType.customInputs.sort((a, b) => a.id - b.id) || []
  );
  const [selectedCustomInput, setSelectedCustomInput] = useState<EventTypeCustomInput | undefined>(undefined);
  const [selectedCustomInputModalOpen, setSelectedCustomInputModalOpen] = useState(false);
  const placeholderHashedLink = `${CAL_URL}/d/${hashedUrl}/${eventType.slug}`;

  const animationRef = useRef(null);

  useEffect(() => {
    animationRef.current && autoAnimate(animationRef.current);
  }, [animationRef]);

  const removeCustom = (index: number) => {
    formMethods.getValues("customInputs").splice(index, 1);
    customInputs.splice(index, 1);
    setCustomInputs([...customInputs]);
  };

  useEffect(() => {
    !hashedUrl && setHashedUrl(generateHashedLink(eventType.users[0]?.id ?? team?.id));
  }, [eventType.users, hashedUrl, team?.id]);

  return (
    <div className="flex flex-col space-y-8">
      {/**
       * Only display calendar selector if user has connected calendars AND if it's not
       * a team event. Since we don't have logic to handle each attende calendar (for now).
       * This will fallback to each user selected destination calendar.
       */}
      {!!connectedCalendarsQuery.data?.connectedCalendars.length && !team && (
        <div className="flex flex-col">
          <Label>{t("add_to_calendar")}</Label>
          <div className="w-full">
            <Controller
              control={formMethods.control}
              name="destinationCalendar"
              defaultValue={eventType.destinationCalendar || undefined}
              render={({ field: { onChange, value } }) => (
                <DestinationCalendarSelector
                  value={value ? value.externalId : undefined}
                  onChange={onChange}
                  hidePlaceholder
                />
              )}
            />
          </div>
          <p className="text-sm text-gray-600">{t("select_which_cal")}</p>
        </div>
      )}
      <div className="w-full">
        <TextField
          label={t("event_name")}
          type="text"
          placeholder={t("meeting_with_user")}
          defaultValue={eventType.eventName || ""}
          {...formMethods.register("eventName")}
          addOnSuffix={
            <Button
              type="button"
              StartIcon={Icon.FiEdit}
              size="icon"
              color="minimal"
              className="hover:stroke-3 hover:bg-transparent hover:text-black"
              onClick={() => setShowEventNameTip((old) => !old)}
            />
          }
        />
      </div>
      <hr />
      <div className="">
        <div className="flex space-x-3 ">
          <Switch
            checked={customInputs.length > 0}
            onCheckedChange={(e) => {
              if (e && customInputs.length === 0) {
                // Push a placeholders
                setSelectedCustomInput(undefined);
                setSelectedCustomInputModalOpen(true);
              } else if (!e) {
                setCustomInputs([]);
                formMethods.setValue("customInputs", []);
              }
            }}
          />
          <div className="flex flex-col">
            <Label className="text-sm font-semibold leading-none text-black">{t("additional_inputs")}</Label>
            <p className="-mt-2 text-sm leading-normal text-gray-600">{t("additional_input_description")}</p>
          </div>
        </div>
        <ul className="my-4" ref={animationRef}>
          {customInputs.map((customInput: EventTypeCustomInput, idx: number) => (
            <CustomInputItem
              key={idx}
              question={customInput.label}
              type={customInput.type}
              required={customInput.required}
              editOnClick={() => {
                setSelectedCustomInput(customInput);
                setSelectedCustomInputModalOpen(true);
              }}
              deleteOnClick={() => removeCustom(idx)}
            />
          ))}
        </ul>
        {customInputs.length > 0 && (
          <Button
            StartIcon={Icon.FiPlus}
            color="minimal"
            type="button"
            onClick={() => {
              setSelectedCustomInput(undefined);
              setSelectedCustomInputModalOpen(true);
            }}>
            Add an input
          </Button>
        )}
      </div>
      <hr />
      <Controller
        name="requiresConfirmation"
        defaultValue={eventType.requiresConfirmation}
        render={({ field: { value, onChange } }) => (
          <div className="flex space-x-3 ">
            <Switch name="requireConfirmation" checked={value} onCheckedChange={(e) => onChange(e)} />
            <div className="flex flex-col">
              <Label className="text-sm font-semibold leading-none text-black">
                {t("requires_confirmation")}
              </Label>
              <p className="-mt-2 text-sm leading-normal text-gray-600">
                {t("requires_confirmation_description")}
              </p>
            </div>
          </div>
        )}
      />
      <hr />
      <Controller
        name="hideCalendarNotes"
        control={formMethods.control}
        defaultValue={eventType.hideCalendarNotes}
        render={({ field: { value, onChange } }) => (
          <div className="flex space-x-3 ">
            <Switch name="hideCalendarNotes" checked={value} onCheckedChange={(e) => onChange(e)} />
            <div className="flex flex-col">
              <Label className="text-sm font-semibold leading-none text-black">{t("disable_notes")}</Label>
              <p className="-mt-2 text-sm leading-normal text-gray-600">{t("disable_notes_description")}</p>
            </div>
          </div>
        )}
      />
      <hr />
      <Controller
        name="hashedLink"
        control={formMethods.control}
        defaultValue={hashedUrl}
        render={({ field: { value, onChange } }) => (
          <>
            <div className="flex space-x-3 ">
              <Switch
                name="hashedLinkCheck"
                defaultChecked={!!value}
                onCheckedChange={(e) => {
                  setHashedLinkVisible(e);
                  onChange(e ? hashedUrl : undefined);
                }}
              />
              <div className="flex flex-col">
                <Label className="text-sm font-semibold leading-none text-black">{t("private_link")}</Label>
                <p className="-mt-2 text-sm leading-normal text-gray-600">{t("private_link_description")}</p>
              </div>
            </div>

            {hashedLinkVisible && (
              <div className="">
                <TextField
                  disabled
                  name="hashedLink"
                  label={t("private_link_label")}
                  data-testid="generated-hash-url"
                  type="text"
                  hint={t("private_link_hint")}
                  defaultValue={placeholderHashedLink}
                  addOnSuffix={
                    <Tooltip
                      content={eventType.hashedLink ? t("copy_to_clipboard") : t("enabled_after_update")}>
                      <Button
                        color="minimal"
                        onClick={() => {
                          navigator.clipboard.writeText(placeholderHashedLink);
                          if (eventType.hashedLink) {
                            showToast(t("private_link_copied"), "success");
                          } else {
                            showToast(t("enabled_after_update_description"), "warning");
                          }
                        }}
                        className="hover:stroke-3 hover:bg-transparent hover:text-black"
                        type="button">
                        <Icon.FiCopy />
                      </Button>
                    </Tooltip>
                  }
                />
              </div>
            )}
          </>
        )}
      />
      {showEventNameTip && (
        <Dialog open={showEventNameTip} onOpenChange={setShowEventNameTip}>
          <DialogContent
            title={t("custom_event_name")}
            description={t("custom_event_name_description")}
            type="creation"
            actionText="Create"
            // Set event name back to what it was on close
            actionOnClose={() => formMethods.setValue("eventName", eventType.eventName ?? "")}
            actionOnClick={() => setShowEventNameTip(false)}>
            <TextField
              label={t("event_name")}
              type="text"
              placeholder={t("meeting_with_user")}
              defaultValue={eventType.eventName || ""}
              {...formMethods.register("eventName")}
            />
            <div className="mt-1 text-gray-500">
              <p>{`{HOST} = ${t("your_name")}`}</p>
              <p>{`{ATTENDEE} = ${t("attendee_name")}`}</p>
              <p>{`{HOST/ATTENDEE} = ${t("dynamically_display_attendee_or_organizer")}`}</p>
              <p>{`{LOCATION} = ${t("event_location")}`}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Controller
        name="customInputs"
        control={formMethods.control}
        defaultValue={eventType.customInputs.sort((a, b) => a.id - b.id) || []}
        render={() => (
          <Dialog open={selectedCustomInputModalOpen} onOpenChange={setSelectedCustomInputModalOpen}>
            <DialogContent
              type="creation"
              Icon={Icon.FiPlus}
              title={t("add_new_custom_input_field")}
              useOwnActionButtons
              description={t("this_input_will_shown_booking_this_event")}>
              <CustomInputTypeForm
                selectedCustomInput={selectedCustomInput}
                onSubmit={(values) => {
                  const customInput: EventTypeCustomInput = {
                    id: -1,
                    eventTypeId: -1,
                    label: values.label,
                    placeholder: values.placeholder,
                    required: values.required,
                    type: values.type,
                  };

                  if (selectedCustomInput) {
                    selectedCustomInput.label = customInput.label;
                    selectedCustomInput.placeholder = customInput.placeholder;
                    selectedCustomInput.required = customInput.required;
                    selectedCustomInput.type = customInput.type;
                  } else {
                    setCustomInputs(customInputs.concat(customInput));
                    formMethods.setValue("customInputs", customInputs.concat(customInput));
                  }
                  setSelectedCustomInputModalOpen(false);
                }}
                onCancel={() => {
                  setSelectedCustomInputModalOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      />
    </div>
  );
};