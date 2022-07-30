import type { User } from "@prisma/client";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { Fragment, ReactNode, useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

import dayjs from "@calcom/dayjs";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import LicenseBanner from "@calcom/features/ee/common/components/LicenseBanner";
import TrialBanner from "@calcom/features/ee/common/components/TrialBanner";
import ImpersonatingBanner from "@calcom/features/ee/impersonation/components/ImpersonatingBanner";
import HelpMenuItem from "@calcom/features/ee/support/components/HelpMenuItem";
import CustomBranding from "@calcom/lib/CustomBranding";
import classNames from "@calcom/lib/classNames";
import { JOIN_SLACK, ROADMAP, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { SVGComponent } from "@calcom/types/SVGComponent";
import Button from "@calcom/ui/Button";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/Dropdown";
import { CollectionIcon, Icon } from "@calcom/ui/Icon";

/* TODO: Migate this */
import { HeadSeo } from "../../apps/web/components/seo/head-seo";

/* TODO: Get this from endpoint */
import pkg from "../../apps/web/package.json";
import ErrorBoundary from "./ErrorBoundary";
import { KBarContent, KBarRoot, KBarTrigger } from "./Kbar";
import Logo from "./Logo";

export const ONBOARDING_INTRODUCED_AT = dayjs("September 1 2021").toISOString();

export const ONBOARDING_NEXT_REDIRECT = {
  redirect: {
    permanent: false,
    destination: "/getting-started",
  },
} as const;

export const shouldShowOnboarding = (user: Pick<User, "createdDate" | "completedOnboarding">) => {
  return !user.completedOnboarding && dayjs(user.createdDate).isAfter(ONBOARDING_INTRODUCED_AT);
};

function useRedirectToLoginIfUnauthenticated(isPublic = false) {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const router = useRouter();

  useEffect(() => {
    if (isPublic) {
      return;
    }

    if (!loading && !session) {
      router.replace({
        pathname: "/auth/login",
        query: {
          callbackUrl: `${WEBAPP_URL}${location.pathname}${location.search}`,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, isPublic]);

  return {
    loading: loading && !session,
    session,
  };
}

function useRedirectToOnboardingIfNeeded() {
  const router = useRouter();
  const query = useMeQuery();
  const user = query.data;

  const isRedirectingToOnboarding = user && shouldShowOnboarding(user);

  useEffect(() => {
    if (isRedirectingToOnboarding) {
      router.replace({
        pathname: "/getting-started",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRedirectingToOnboarding]);
  return {
    isRedirectingToOnboarding,
  };
}

export function ShellSubHeading(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("mb-3 block justify-between sm:flex", props.className)}>
      <div>
        <h2 className="flex content-center items-center space-x-2 text-base font-bold leading-6 text-gray-900 rtl:space-x-reverse">
          {props.title}
        </h2>
        {props.subtitle && <p className="text-sm text-neutral-500 ltr:mr-4">{props.subtitle}</p>}
      </div>
      {props.actions && <div className="flex-shrink-0">{props.actions}</div>}
    </div>
  );
}

const Layout = (props: LayoutProps & { isLoading: boolean }) => {
  const isEmbed = useIsEmbed();
  const router = useRouter();
  const { t } = useLocale();
  const { status } = useSession();
  const pageTitle = typeof props.heading === "string" ? props.heading : props.title;

  return (
    <>
      <HeadSeo
        title={pageTitle ?? "Cal.com"}
        description={props.subtitle ? props.subtitle?.toString() : ""}
        nextSeoProps={{
          nofollow: true,
          noindex: true,
        }}
      />
      <div>
        <Toaster position="bottom-right" />
      </div>

      <div
        className={classNames("flex h-screen overflow-hidden", props.large ? "bg-white" : "bg-gray-100")}
        data-testid="dashboard-shell">
        {status === "authenticated" && (
          <div style={isEmbed ? { display: "none" } : {}} className="hidden md:flex lg:flex-shrink-0">
            <div className="flex w-14 flex-col lg:w-56">
              <div className="flex h-0 flex-1 flex-col border-r border-gray-200 bg-white">
                <div className="flex flex-1 flex-col overflow-y-auto pt-3 pb-4 lg:pt-5">
                  <div className="items-center justify-between md:hidden lg:flex">
                    <Link href="/event-types">
                      <a className="px-4">
                        <Logo small />
                      </a>
                    </Link>
                    <div className="px-4">
                      <KBarTrigger />
                    </div>
                  </div>
                  {/* logo icon for tablet */}
                  <Link href="/event-types">
                    <a className="text-center md:inline lg:hidden">
                      <Logo small icon />
                    </a>
                  </Link>
                  <Navigation />
                </div>
                <TrialBanner />
                <div data-testid="user-dropdown-trigger">
                  <span className="hidden lg:inline">
                    <UserDropdown />
                  </span>
                  <span className="hidden md:inline lg:hidden">
                    <UserDropdown small />
                  </span>
                </div>
                <DeploymentInfo />
              </div>
            </div>
          </div>
        )}

        <div className="flex w-0 flex-1 flex-col overflow-hidden">
          <ImpersonatingBanner />
          <main
            className={classNames(
              "relative z-0 flex-1 overflow-y-auto focus:outline-none",
              status === "authenticated" && "max-w-[1700px]",
              props.flexChildrenContainer && "flex flex-col"
            )}>
            {/* show top navigation for md and smaller (tablet and phones) */}
            {status === "authenticated" && (
              <nav
                style={isEmbed ? { display: "none" } : {}}
                className="flex items-center justify-between border-b border-gray-200 bg-white p-4 md:hidden">
                <Link href="/event-types">
                  <a>
                    <Logo />
                  </a>
                </Link>
                <div className="flex items-center gap-2 self-center">
                  <span className="group flex items-center rounded-full p-2.5 text-sm font-medium text-neutral-500 hover:bg-gray-50 hover:text-neutral-900 lg:hidden">
                    <KBarTrigger />
                  </span>
                  <button className="rounded-full bg-white p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2">
                    <span className="sr-only">{t("settings")}</span>
                    <Link href="/settings/profile">
                      <a>
                        <Icon.Settings className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </Link>
                  </button>
                  <UserDropdown small />
                </div>
              </nav>
            )}
            <div
              className={classNames(
                props.centered && "mx-auto md:max-w-5xl",
                props.flexChildrenContainer && "flex flex-1 flex-col",
                !props.large && "py-8"
              )}>
              {!!props.backPath && (
                <div className="mx-3 mb-8 sm:mx-8">
                  <Button
                    onClick={() => router.push(props.backPath as string)}
                    StartIcon={Icon.ArrowLeft}
                    color="secondary">
                    Back
                  </Button>
                </div>
              )}
              {props.heading && (
                <div
                  className={classNames(
                    props.large && "bg-gray-100 py-8 lg:mb-8 lg:pt-16 lg:pb-7",
                    "block justify-between px-4 sm:flex sm:px-6 md:px-8"
                  )}>
                  {props.HeadingLeftIcon && <div className="ltr:mr-4">{props.HeadingLeftIcon}</div>}
                  <div className="mb-8 w-full">
                    {props.isLoading ? (
                      <>
                        <div className="mb-1 h-6 w-24 animate-pulse rounded-md bg-gray-200" />
                        <div className="mb-1 h-6 w-32 animate-pulse rounded-md bg-gray-200" />
                      </>
                    ) : (
                      <>
                        <h1 className="font-cal mb-1 text-xl font-bold capitalize tracking-wide text-gray-900">
                          {props.heading}
                        </h1>
                        <p className="text-sm text-neutral-500 ltr:mr-4 rtl:ml-4">{props.subtitle}</p>
                      </>
                    )}
                  </div>
                  {props.CTA && <div className="mb-4 flex-shrink-0">{props.CTA}</div>}
                </div>
              )}
              <div
                className={classNames(
                  "px-4 sm:px-6 md:px-8",
                  props.flexChildrenContainer && "flex flex-1 flex-col"
                )}>
                <ErrorBoundary>{!props.isLoading ? props.children : props.customLoader}</ErrorBoundary>
              </div>
              {/* show bottom navigation for md and smaller (tablet and phones) */}
              {status === "authenticated" && <MobileNavigation />}
              {/* add padding to content for mobile navigation*/}
              <div className="block pt-12 md:hidden" />
            </div>
            <LicenseBanner />
          </main>
        </div>
      </div>
    </>
  );
};

type LayoutProps = {
  centered?: boolean;
  title?: string;
  heading?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  CTA?: ReactNode;
  large?: boolean;
  HeadingLeftIcon?: ReactNode;
  backPath?: string; // renders back button to specified path
  // use when content needs to expand with flex
  flexChildrenContainer?: boolean;
  isPublic?: boolean;
  customLoader?: ReactNode;
};

const CustomBrandingContainer = () => {
  const { data: user } = useMeQuery();
  return <CustomBranding lightVal={user?.brandColor} darkVal={user?.darkBrandColor} />;
};

export default function Shell(props: LayoutProps) {
  useRedirectToLoginIfUnauthenticated(props.isPublic);
  useRedirectToOnboardingIfNeeded();
  useTheme("light");

  return (
    <KBarRoot>
      <CustomBrandingContainer />
      <Layout {...props} isLoading={false} />
      <KBarContent />
    </KBarRoot>
  );
}

function UserDropdown({ small }: { small?: boolean }) {
  const { t } = useLocale();
  const query = useMeQuery();
  const user = query.data;
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const Beacon = window.Beacon;
    // window.Beacon is defined when user actually opens up HelpScout and username is available here. On every re-render update session info, so that it is always latest.
    Beacon &&
      Beacon("session-data", {
        username: user?.username || "Unknown",
        screenResolution: `${screen.width}x${screen.height}`,
      });
  });
  const mutation = trpc.useMutation("viewer.away", {
    onSettled() {
      utils.invalidateQueries("viewer.me");
    },
  });
  const utils = trpc.useContext();
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user) {
    return null;
  }
  const onHelpItemSelect = () => {
    setHelpOpen(false);
    setMenuOpen(false);
  };

  // Prevent rendering dropdown if user isn't available.
  // We don't want to show nameless user.
  if (!user) {
    return null;
  }
  return (
    <Dropdown open={menuOpen} onOpenChange={() => setHelpOpen(false)}>
      <DropdownMenuTrigger asChild onClick={() => setMenuOpen(true)}>
        <button className="group flex w-full cursor-pointer appearance-none items-center rounded-full p-2 text-left hover:bg-gray-100 sm:pl-3 md:rounded-none lg:pl-2">
          <span
            className={classNames(
              small ? "h-8 w-8" : "h-9 w-9 ltr:mr-2 rtl:ml-3",
              "relative flex-shrink-0 rounded-full bg-gray-300 "
            )}>
            {
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="rounded-full"
                src={WEBAPP_URL + "/" + user.username + "/avatar.png"}
                alt={user.username || "Nameless User"}
              />
            }
            {!user.away && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
            {user.away && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-yellow-500" />
            )}
          </span>
          {!small && (
            <span className="flex flex-grow items-center truncate">
              <span className="flex-grow truncate text-sm">
                <span className="block truncate font-medium text-gray-900">
                  {user.name || "Nameless User"}
                </span>
                <span className="block truncate font-normal text-neutral-500">
                  {user.username
                    ? process.env.NEXT_PUBLIC_WEBSITE_URL === "https://cal.com"
                      ? `cal.com/${user.username}`
                      : `/${user.username}`
                    : "No public page"}
                </span>
              </span>
              <Icon.MoreVertical
                className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                aria-hidden="true"
              />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent portalled={true} onInteractOutside={() => setMenuOpen(false)}>
        {helpOpen ? (
          <HelpMenuItem onHelpItemSelect={() => onHelpItemSelect()} />
        ) : (
          <>
            <DropdownMenuItem>
              <a
                onClick={() => {
                  mutation.mutate({ away: !user?.away });
                  utils.invalidateQueries("viewer.me");
                }}
                className="flex min-w-max cursor-pointer items-center px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900">
                <Icon.Moon
                  className={classNames(
                    user.away
                      ? "text-purple-500 group-hover:text-purple-700"
                      : "text-gray-500 group-hover:text-gray-700",
                    "h-4 w-4 flex-shrink-0 ltr:mr-2 rtl:ml-3"
                  )}
                  aria-hidden="true"
                />
                {user.away ? t("set_as_free") : t("set_as_away")}
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="h-px bg-gray-200" />
            {user.username && (
              <DropdownMenuItem>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`${process.env.NEXT_PUBLIC_WEBSITE_URL}/${user.username}`}
                  className="flex items-center px-4 py-2 text-sm text-gray-700">
                  <Icon.ExternalLink className="h-4 w-4 text-gray-500 ltr:mr-2 rtl:ml-3" />{" "}
                  {t("view_public_page")}
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="h-px bg-gray-200" />
            <DropdownMenuItem>
              <a
                href={JOIN_SLACK}
                target="_blank"
                rel="noreferrer"
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
                <Icon.Slack strokeWidth={1.5} className="h-4 w-4 text-gray-500 ltr:mr-2 rtl:ml-3" />{" "}
                {t("join_our_slack")}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={ROADMAP}
                className="flex items-center px-4 py-2 text-sm text-gray-700">
                <Icon.Map className="h-4 w-4 text-gray-500 ltr:mr-2 rtl:ml-3" /> {t("visit_roadmap")}
              </a>
            </DropdownMenuItem>

            <button
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setHelpOpen(true)}>
              <Icon.HelpCircle
                className={classNames(
                  "text-gray-500 group-hover:text-neutral-500",
                  "h-4 w-4 flex-shrink-0 ltr:mr-2"
                )}
                aria-hidden="true"
              />

              {t("help")}
            </button>

            <DropdownMenuSeparator className="h-px bg-gray-200" />
            <DropdownMenuItem>
              <a
                onClick={() => signOut({ callbackUrl: "/auth/logout" })}
                className="flex cursor-pointer items-center px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900">
                <Icon.LogOut
                  className={classNames(
                    "text-gray-500 group-hover:text-gray-700",
                    "h-4 w-4 flex-shrink-0 ltr:mr-2 rtl:ml-3"
                  )}
                  aria-hidden="true"
                />
                {t("sign_out")}
              </a>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </Dropdown>
  );
}

type NavigationItemType = {
  name: string;
  href: string;
  icon?: SVGComponent;
  child?: NavigationItemType[];
  pro?: true;
};

const navigation: NavigationItemType[] = [
  {
    name: "event_types_page_title",
    href: "/event-types",
    icon: Icon.Link,
  },
  {
    name: "bookings",
    href: "/bookings/upcoming",
    icon: Icon.Calendar,
  },
  {
    name: "availability",
    href: "/availability",
    icon: Icon.Clock,
  },
  {
    name: "Routing Forms",
    href: "/apps/routing_forms/forms",
    icon: CollectionIcon,
  },
  {
    name: "workflows",
    href: "/workflows",
    icon: Icon.Zap,
    pro: true,
  },
  {
    name: "apps",
    href: "/apps",
    icon: Icon.Grid,
    child: [
      {
        name: "app_store",
        href: "/apps",
      },
      {
        name: "installed_apps",
        href: "/apps/installed",
      },
    ],
  },
  {
    name: "settings",
    href: "/settings/profile",
    icon: Icon.Settings,
  },
];

const requiredCredentialNavigationItems = ["Routing Forms"];

const Navigation = () => (
  <nav className="mt-2 flex-1 space-y-1 bg-white px-2 lg:mt-5">
    {navigation.map((item) => (
      <NavigationItem key={item.name} item={item} />
    ))}
    <span className="group flex items-center rounded-sm px-2 py-2 text-sm font-medium text-neutral-500 hover:bg-gray-50 hover:text-neutral-900 lg:hidden">
      <KBarTrigger />
    </span>
  </nav>
);

const NavigationItem: React.FC<{
  item: NavigationItemType;
  isChild?: boolean;
}> = (props) => {
  const { status } = useSession();
  const { item, isChild } = props;
  const { t } = useLocale();
  const router = useRouter();
  const current = isChild ? item.href === router.asPath : router.asPath.startsWith(item.href);
  /*  Begin special condition to render Routing Forms only when installed  */
  const { data: routingForms } = trpc.useQuery(["viewer.appById", { appId: "routing_forms" }], {
    enabled: status === "authenticated" && requiredCredentialNavigationItems.includes(props.item.name),
  });
  if (requiredCredentialNavigationItems.includes(props.item.name) && !routingForms) return null;
  /* Ends special condition to render Routing Forms only when installed */
  return (
    <Fragment>
      <Link href={item.href}>
        <a
          aria-label={t(item.name)}
          className={classNames(
            "group flex items-center rounded-sm px-2 py-2 text-sm font-medium text-neutral-500 hover:bg-gray-50 hover:text-neutral-900  [&[aria-current='page']]:hover:text-neutral-900",
            isChild
              ? "hidden pl-10 lg:flex [&[aria-current='page']]:text-neutral-900"
              : "[&[aria-current='page']]:bg-neutral-100"
          )}
          aria-current={current ? "page" : undefined}>
          {item.icon && (
            <item.icon
              className="h-5 w-5 flex-shrink-0 text-neutral-400 group-hover:text-neutral-500 ltr:mr-3 rtl:ml-3 [&[aria-current='page']]:text-neutral-500"
              aria-hidden="true"
              aria-current={current ? "page" : undefined}
            />
          )}
          <span className="hidden lg:inline">{t(item.name)}</span>
        </a>
      </Link>
      {item.child &&
        router.asPath.startsWith(item.href) &&
        item.child.map((item) => <NavigationItem key={item.name} item={item} isChild />)}
    </Fragment>
  );
};

const MobileNavigation = () => {
  const isEmbed = useIsEmbed();
  return (
    <nav
      className={classNames(
        "bottom-nav fixed bottom-0 z-30 flex w-full bg-white shadow md:hidden",
        isEmbed && "hidden"
      )}>
      {navigation
        .filter((i) => i.href !== "/settings/profile")
        .map((item, itemIdx) => (
          <MobileNavigationItem key={item.name} item={item} itemIdx={itemIdx} />
        ))}
    </nav>
  );
};

const MobileNavigationItem: React.FC<{
  item: NavigationItemType;
  itemIdx: number;
  isChild?: boolean;
}> = (props) => {
  const { item, itemIdx, isChild } = props;
  const router = useRouter();
  const { t } = useLocale();
  const current = isChild ? item.href === router.asPath : router.asPath.startsWith(item.href);
  /*  Begin special condition to render Routing Forms only when installed  */
  const { status } = useSession();
  const { data: routingForms } = trpc.useQuery(["viewer.appById", { appId: "routing_forms" }], {
    enabled: status === "authenticated" && requiredCredentialNavigationItems.includes(props.item.name),
  });
  if (requiredCredentialNavigationItems.includes(props.item.name) && !routingForms) return null;
  /* Ends special condition to render Routing Forms only when installed */
  return (
    <Link key={item.name} href={item.href}>
      <a
        className={classNames(
          itemIdx === 0 ? "rounded-l-lg" : "",
          itemIdx === navigation.length - 1 ? "rounded-r-lg" : "",
          "group relative min-w-0 flex-1 overflow-hidden bg-white py-2 px-2 text-center text-xs font-medium text-neutral-400 hover:bg-gray-50 hover:text-gray-700 focus:z-10 sm:text-sm [&[aria-current='page']]:text-gray-900"
        )}
        aria-current={current ? "page" : undefined}>
        {item.icon && (
          <item.icon
            className="mx-auto mb-1 block h-5 w-5 flex-shrink-0 text-center text-gray-400 group-hover:text-gray-500 [&[aria-current='page']]:text-gray-900"
            aria-hidden="true"
            aria-current={current ? "page" : undefined}
          />
        )}
        <span className="truncate">{t(item.name)}</span>
      </a>
    </Link>
  );
};

function DeploymentInfo() {
  const query = useMeQuery();
  const user = query.data;

  return (
    <small
      style={{
        fontSize: "0.5rem",
      }}
      className="mx-3 mt-1 mb-2 hidden opacity-50 lg:block">
      &copy; {new Date().getFullYear()} Cal.com, Inc. v.{pkg.version + "-"}
      {process.env.NEXT_PUBLIC_WEBSITE_URL === "https://cal.com" ? "h" : "sh"}
      <span className="lowercase" data-testid={`plan-${user?.plan.toLowerCase()}`}>
        -{user?.plan}
      </span>
    </small>
  );
}