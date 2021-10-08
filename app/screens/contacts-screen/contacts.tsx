import { gql, useQuery } from "@apollo/client"
import { useFocusEffect } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"
import * as React from "react"
import { useCallback, useMemo, useState } from "react"
import { ActivityIndicator, Text, View } from "react-native"
import {
  ListItem,
  SearchBar,
  SearchBarAndroidProps,
  SearchBarDefaultProps,
  SearchBarIosProps,
} from "react-native-elements"
import { SearchBarBaseProps } from "react-native-elements/dist/searchbar/SearchBar"
import EStyleSheet from "react-native-extended-stylesheet"
import { FlatList } from "react-native-gesture-handler"
import Icon from "react-native-vector-icons/Ionicons"

import { Screen } from "../../components/screen"
import { translate } from "../../i18n"
import { ContactStackParamList } from "../../navigation/stack-param-lists"
import { color } from "../../theme"
import { ScreenType } from "../../types/jsx"
import { toastShow } from "../../utils/toast"

// TODO: get rid of this wrapper once SearchBar props are figured out ref: https://github.com/react-native-elements/react-native-elements/issues/3089
const SafeSearchBar = SearchBar as unknown as React.FC<
  SearchBarBaseProps | SearchBarDefaultProps | SearchBarAndroidProps | SearchBarIosProps
>

const filteredContactNames = ["BitcoinBeachMarketing"]

const styles = EStyleSheet.create({
  activityIndicatorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },

  emptyListNoContacts: {
    marginHorizontal: 12,
    marginTop: 32,
  },

  emptyListNoMatching: {
    marginHorizontal: 26,
    marginTop: 8,
  },

  emptyListTitle: {
    fontSize: 18,
  },

  item: {
    marginHorizontal: 32,
    marginVertical: 8,
  },

  itemContainer: { borderRadius: 8 },

  listContainer: { flexGrow: 1 },

  searchBarContainer: {
    backgroundColor: color.palette.lighterGrey,
    borderBottomWidth: 0,
    borderTopWidth: 0,
    marginHorizontal: 26,
    marginVertical: 8,
    paddingTop: 8,
  },

  searchBarInputContainerStyle: {
    backgroundColor: color.palette.white,
  },

  searchBarRightIconStyle: {
    padding: 8,
  },

  searchBarText: {
    color: color.palette.black,
    textDecorationLine: "none",
  },
})

type Props = {
  navigation: StackNavigationProp<ContactStackParamList, "Contacts">
}

export const ContactsScreen: ScreenType = ({ navigation }: Props) => {
  const [isRefreshed, setIsRefreshed] = useState(false)
  const { loading, data, error, refetch } = useQuery(gql`
    query contacts {
      me {
        contacts {
          username
          alias
          transactionsCount
        }
      }
    }
  `)

  useFocusEffect(() => {
    if (!isRefreshed) {
      setIsRefreshed(true)
      refetch()
    }
  })

  if (error) {
    toastShow(error.message)
  }

  const contacts: Contact[] = useMemo(() => {
    return (
      data?.me?.contacts.filter((contact) => {
        return !filteredContactNames.includes(contact.username)
      }) ?? []
    )
  }, [data])
  const [matchingContacts, setMatchingContacts] = useState([])
  const [searchText, setSearchText] = useState("")

  React.useEffect(() => {
    setMatchingContacts(contacts)
  }, [contacts])

  // This implementation of search will cause a match if any word in the search text
  // matches the contacts name or prettyName.
  const updateMatchingContacts = useCallback(
    (newSearchText: string) => {
      setSearchText(newSearchText)
      if (newSearchText.length > 0) {
        const searchWordArray = newSearchText
          .split(" ")
          .filter((text) => text.trim().length > 0)
        const matchingContacts = contacts.filter((contact) =>
          searchWordArray.some((word) => wordMatchesContact(word, contact)),
        )
        setMatchingContacts(matchingContacts)
      } else {
        setMatchingContacts(contacts)
      }
    },
    [contacts],
  )

  const wordMatchesContact = (searchWord: string, contact: Contact): boolean => {
    let contactPrettyNameMatchesSearchWord

    const contactNameMatchesSearchWord = contact.username
      .toLowerCase()
      .includes(searchWord.toLowerCase())

    if (contact.alias === null) {
      contactPrettyNameMatchesSearchWord = false
    } else {
      contactPrettyNameMatchesSearchWord = contact.alias
        .toLowerCase()
        .includes(searchWord.toLowerCase())
    }

    return contactNameMatchesSearchWord || contactPrettyNameMatchesSearchWord
  }

  React.useEffect(() => {
    updateMatchingContacts(searchText)
  }, [searchText, updateMatchingContacts, data])

  let searchBarContent: JSX.Element
  let listEmptyContent: JSX.Element

  if (contacts.length > 0) {
    searchBarContent = (
      <SafeSearchBar
        placeholder={translate("common.search")}
        value={searchText}
        platform="default"
        round
        lightTheme
        showCancel={false}
        showLoading={false}
        containerStyle={styles.searchBarContainer}
        inputContainerStyle={styles.searchBarInputContainerStyle}
        inputStyle={styles.searchBarText}
        rightIconContainerStyle={styles.searchBarRightIconStyle}
      />
    )
  } else {
    searchBarContent = null
  }

  if (contacts.length > 0) {
    listEmptyContent = (
      <View style={styles.emptyListNoMatching}>
        <Text style={styles.emptyListTitle}>
          {translate("ContactsScreen.noMatchingContacts")}
        </Text>
      </View>
    )
  } else if (loading) {
    listEmptyContent = (
      <View style={styles.activityIndicatorContainer}>
        <ActivityIndicator size="large" color={color.palette.midGrey} />
      </View>
    )
  } else {
    listEmptyContent = (
      <View style={styles.emptyListNoContacts}>
        <Text style={styles.emptyListTitle}>
          {translate("ContactsScreen.noContactsYet")}
        </Text>
      </View>
    )
  }

  return (
    <Screen backgroundColor={color.palette.lighterGrey}>
      {searchBarContent}
      <FlatList
        contentContainerStyle={styles.listContainer}
        data={matchingContacts}
        ListEmptyComponent={() => listEmptyContent}
        renderItem={({ item }) => (
          <ListItem
            underlayColor={color.palette.lighterGrey}
            activeOpacity={0.7}
            style={styles.item}
            containerStyle={styles.itemContainer}
            onPress={() => navigation.navigate("contactDetail", { contact: item })}
          >
            <Icon name={"ios-person-outline"} size={24} color={color.palette.green} />
            <ListItem.Content>
              <ListItem.Title>{item.alias}</ListItem.Title>
            </ListItem.Content>
          </ListItem>
        )}
        keyExtractor={(item) => item.id}
      />
    </Screen>
  )
}
